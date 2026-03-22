"""API handler for voice feedback on tailored resumes."""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from database import get_voice_feedback_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.user import UserInfo
from models.voice_feedback import VoiceFeedbackCreate, VoiceFeedbackResponse
from motor.motor_asyncio import AsyncIOMotorCollection
from services.anthropic_client import (
    CHUNK_TYPE_ANTI_PATTERN,
    CHUNK_TYPE_VOICE_EXAMPLE,
    schedule_background,
)
from services.feedback_indexer import index_feedback
from services.vector_store import delete_vector, update_payload
from utils import find_many_and_convert, mongo_to_pydantic

router = APIRouter(prefix="/voice")


async def _index_feedback_background(
    text: str,
    feedback_type: str,
    job_context: str,
    user_id: str,
    doc_id,
    collection: AsyncIOMotorCollection,
) -> None:
    """Index feedback in Qdrant and write qdrant_id back to MongoDB."""
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

    text_to_embed = body.final_text if body.feedback_type == "edited" else body.original_text
    schedule_background(
        _index_feedback_background(
            text_to_embed, body.feedback_type, body.job_context, user.id, doc["_id"], collection
        )
    )

    return mongo_to_pydantic(doc, VoiceFeedbackResponse)


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

    return await find_many_and_convert(
        collection, query, VoiceFeedbackResponse, sort=[("created_at", -1)], limit=100
    )


async def _update_qdrant_type(qdrant_id: str, chunk_type: str, feedback_type: str) -> None:
    try:
        await asyncio.to_thread(
            update_payload, qdrant_id, {"chunk_type": chunk_type, "feedback_type": feedback_type}
        )
    except Exception as e:
        logger.error_with_context("Failed to update Qdrant payload", {"error": str(e)})


async def _delete_qdrant_vector(qdrant_id: str) -> None:
    try:
        await asyncio.to_thread(delete_vector, qdrant_id)
    except Exception as e:
        logger.error_with_context("Failed to delete Qdrant vector", {"error": str(e)})


@router.put("/feedback/{feedback_id}", response_model=VoiceFeedbackResponse)
@limiter.limit("10/minute")
@requires_auth
async def reclassify_feedback(
    request: Request,
    feedback_id: str,
    feedback_type: str = Query(..., pattern="^(approved|rejected|flagged)$"),
    collection: AsyncIOMotorCollection = Depends(get_voice_feedback_collection),
):
    """Reclassify a feedback entry's type. Cannot reclassify to 'edited' (requires final_text)."""
    user: UserInfo = request.state.user

    try:
        oid = ObjectId(feedback_id)
    except InvalidId:
        raise HTTPException(status_code=422, detail="Invalid feedback ID")

    now = datetime.now(timezone.utc)
    result = await collection.find_one_and_update(
        {"_id": oid, "user_id": user.id},
        {"$set": {"feedback_type": feedback_type, "updated_at": now}},
        return_document=True,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Feedback not found")

    qdrant_id = result.get("qdrant_id")
    if qdrant_id:
        chunk_type = (
            CHUNK_TYPE_ANTI_PATTERN
            if feedback_type in ("rejected", "flagged")
            else CHUNK_TYPE_VOICE_EXAMPLE
        )
        schedule_background(_update_qdrant_type(qdrant_id, chunk_type, feedback_type))

    return mongo_to_pydantic(result, VoiceFeedbackResponse)


@router.delete("/feedback/{feedback_id}", status_code=204)
@limiter.limit("5/minute")
@requires_auth
async def delete_feedback(
    request: Request,
    feedback_id: str,
    collection: AsyncIOMotorCollection = Depends(get_voice_feedback_collection),
):
    """Delete a feedback entry and its Qdrant vector."""
    user: UserInfo = request.state.user

    try:
        oid = ObjectId(feedback_id)
    except InvalidId:
        raise HTTPException(status_code=422, detail="Invalid feedback ID")

    doc = await collection.find_one({"_id": oid, "user_id": user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Feedback not found")

    await collection.delete_one({"_id": oid})

    qdrant_id = doc.get("qdrant_id")
    if qdrant_id:
        schedule_background(_delete_qdrant_vector(qdrant_id))
