"""API handler for voice feedback on tailored resumes."""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from database import get_voice_feedback_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.user import UserInfo
from models.voice_feedback import VoiceFeedbackCreate, VoiceFeedbackResponse
from motor.motor_asyncio import AsyncIOMotorCollection
from services.feedback_indexer import index_feedback

router = APIRouter(prefix="/voice")

_background_tasks = set()


def _schedule_feedback_indexing(
    text: str,
    feedback_type: str,
    job_context: str,
    user_id: str,
    doc_id: str,
    collection: AsyncIOMotorCollection,
) -> None:
    """Schedule background Qdrant indexing for feedback."""

    async def _run():
        try:
            qdrant_id = await asyncio.to_thread(
                index_feedback, text, feedback_type, job_context, user_id
            )
            if qdrant_id:
                await collection.update_one({"_id": doc_id}, {"$set": {"qdrant_id": qdrant_id}})
                logger.info_with_context(
                    "Feedback indexed in vector store",
                    {"user_id": user_id, "qdrant_id": qdrant_id},
                )
        except Exception as e:
            logger.error_with_context(
                "Failed to index feedback",
                {"user_id": user_id, "error": str(e)},
            )

    task = asyncio.create_task(_run())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


@router.post("/feedback", response_model=VoiceFeedbackResponse, status_code=201)
@limiter.limit("10/minute")
@requires_auth
async def submit_feedback(
    request: Request,
    body: VoiceFeedbackCreate,
    collection: AsyncIOMotorCollection = Depends(get_voice_feedback_collection),
):
    """Submit feedback on tailored resume output."""
    user: UserInfo = request.state.user

    logger.info_with_context(
        "Submitting voice feedback",
        {
            "user_id": user.id,
            "feedback_type": body.feedback_type,
            "job_context": body.job_context,
        },
    )

    now = datetime.now(timezone.utc)
    doc = {
        **body.model_dump(),
        "user_id": user.id,
        "created_at": now,
    }

    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Index in Qdrant — use final_text for edits, original for approve/reject/flag
    text_to_embed = body.final_text if body.feedback_type == "edited" else body.original_text
    _schedule_feedback_indexing(
        text_to_embed,
        body.feedback_type,
        body.job_context,
        user.id,
        doc["_id"],
        collection,
    )

    return VoiceFeedbackResponse(
        id=str(doc["_id"]),
        user_id=user.id,
        original_text=body.original_text,
        final_text=body.final_text,
        feedback_type=body.feedback_type,
        job_context=body.job_context,
        note=body.note,
        section_type=body.section_type,
        created_at=now,
    )


@router.get("/feedback")
@limiter.limit("30/minute")
@requires_auth
async def list_feedback(
    request: Request,
    feedback_type: Optional[str] = Query(None),
    collection: AsyncIOMotorCollection = Depends(get_voice_feedback_collection),
):
    """List voice feedback for the authenticated user."""
    user: UserInfo = request.state.user

    query = {"user_id": user.id}
    if feedback_type:
        query["feedback_type"] = feedback_type

    cursor = collection.find(query).sort("created_at", -1).limit(100)
    results = []
    async for doc in cursor:
        results.append(
            VoiceFeedbackResponse(
                id=str(doc["_id"]),
                user_id=doc["user_id"],
                original_text=doc["original_text"],
                final_text=doc.get("final_text"),
                feedback_type=doc["feedback_type"],
                job_context=doc["job_context"],
                note=doc.get("note"),
                section_type=doc.get("section_type"),
                qdrant_id=doc.get("qdrant_id"),
                created_at=doc["created_at"],
            )
        )

    return results
