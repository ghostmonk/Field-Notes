"""
API handlers for resume builder.
"""

import asyncio
import traceback
from datetime import datetime, timezone

from database import get_resumes_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.resume import (
    ResumeCreate,
    ResumePublicResponse,
    ResumeResponse,
    ResumeUpdate,
)
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from services.anthropic_client import RESUME_INTERNAL_FIELDS, schedule_background
from services.resume_indexer import index_resume
from utils import find_one_and_convert, mongo_to_pydantic


async def _index_resume_background(resume_data: dict, user_id: str) -> None:
    """Index resume in Qdrant as a background task."""
    try:
        count = await asyncio.to_thread(index_resume, resume_data, user_id)
        if count:
            logger.info_with_context(
                "Resume indexed in vector store",
                {"user_id": user_id, "chunks": count},
            )
    except Exception as e:
        logger.error_with_context(
            "Failed to index resume in vector store",
            {"user_id": user_id, "error": str(e)},
        )


router = APIRouter()


@router.get("/resume/public", response_model=ResumePublicResponse)
@limiter.limit("30/minute")
async def get_public_resume(
    request: Request,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Get the public resume (first non-deleted resume)."""
    try:
        query = {"deleted": {"$ne": True}}
        doc = await collection.find_one(query, sort=[("createdDate", 1)])

        if not doc:
            raise HTTPException(status_code=404, detail="Resume not found")

        # Filter out work entries marked as hidden from downloads/public
        if "work_experience" in doc:
            doc["work_experience"] = [
                w for w in doc["work_experience"] if not w.get("hide_from_downloads")
            ]

        return mongo_to_pydantic(doc, ResumePublicResponse)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching public resume",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the resume",
        )


@router.get("/resume", response_model=ResumeResponse)
@requires_auth
async def get_resume(
    request: Request,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Get the current user's resume."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context(
            "Fetching resume",
            {"user_id": user.id},
        )

        resume = await find_one_and_convert(
            collection,
            {"user_id": user.id, "deleted": {"$ne": True}},
            ResumeResponse,
        )

        if not resume:
            logger.warning_with_context("Resume not found", {"user_id": user.id})
            raise HTTPException(status_code=404, detail="Resume not found")

        logger.info_with_context(
            "Successfully fetched resume",
            {"user_id": user.id},
        )
        return resume

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching resume",
            {
                "user_id": getattr(request.state, "user", None) and request.state.user.id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the resume",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.post("/resume", response_model=ResumeResponse, status_code=201)
@limiter.limit("5/minute")
@requires_auth
async def create_resume(
    request: Request,
    resume: ResumeCreate,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Create a new resume."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context(
            "Creating resume",
            {"user_id": user.id},
        )

        current_time = datetime.now(timezone.utc)
        resume_data = resume.model_dump()

        # Attempt 1: atomically reactivate a soft-deleted resume
        reactivated = await collection.find_one_and_update(
            {"user_id": user.id, "deleted": True},
            {
                "$set": {
                    **resume_data,
                    "original_resume": resume_data,
                    "updatedDate": current_time,
                    "createdDate": current_time,
                    "user_id": user.id,
                    "deleted": False,
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if reactivated:
            created_resume = mongo_to_pydantic(reactivated, ResumeResponse)
        else:
            # No soft-deleted doc — check for active resume
            existing = await collection.find_one(
                {"user_id": user.id, "deleted": {"$ne": True}}, {"_id": 1}
            )
            if existing:
                raise HTTPException(status_code=409, detail="Resume already exists for this user")

            # Insert new document with original_resume snapshot
            document = {
                **resume_data,
                "original_resume": resume_data,
                "createdDate": current_time,
                "updatedDate": current_time,
                "user_id": user.id,
            }
            result = await collection.insert_one(document)
            document["_id"] = result.inserted_id
            created_resume = mongo_to_pydantic(document, ResumeResponse)

        if not created_resume:
            logger.error_with_context("Failed to retrieve created resume", {"user_id": user.id})
            raise HTTPException(status_code=500, detail="Failed to retrieve created resume")

        logger.info_with_context(
            "Resume created successfully",
            {"user_id": user.id},
        )

        schedule_background(_index_resume_background(resume_data, user.id))

        return created_resume

    except HTTPException:
        raise
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Resume already exists for this user")
    except Exception as e:
        logger.exception_with_context(
            "Error creating resume",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while creating the resume",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.put("/resume", response_model=ResumeResponse)
@limiter.limit("5/minute")
@requires_auth
async def update_resume(
    request: Request,
    resume: ResumeUpdate,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Update the current user's resume."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context("Updating resume", {"user_id": user.id})

        current_time = datetime.now(timezone.utc)
        update_data = resume.model_dump(exclude_unset=True)
        update_data["updatedDate"] = current_time

        # Keep original_resume in sync with manual edits from resume builder
        original_updates = {
            f"original_resume.{k}": v for k, v in update_data.items() if k != "updatedDate"
        }

        updated_doc = await collection.find_one_and_update(
            {"user_id": user.id, "deleted": {"$ne": True}},
            {"$set": {**update_data, **original_updates}},
            return_document=ReturnDocument.AFTER,
        )

        if not updated_doc:
            logger.warning_with_context("Resume not found for update", {"user_id": user.id})
            raise HTTPException(status_code=404, detail="Resume not found")

        updated_resume = mongo_to_pydantic(updated_doc, ResumeResponse)

        logger.info_with_context("Resume updated successfully", {"user_id": user.id})

        index_data = {k: v for k, v in updated_doc.items() if k not in RESUME_INTERNAL_FIELDS}
        schedule_background(_index_resume_background(index_data, user.id))

        return updated_resume

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error updating resume",
            {
                "user_id": getattr(request.state, "user", None) and request.state.user.id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while updating the resume",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.post("/resume/set-default", response_model=ResumeResponse)
@limiter.limit("5/minute")
@requires_auth
async def set_default_resume(
    request: Request,
    resume: ResumeUpdate,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Set a tailored resume as the active default. Original is preserved in original_resume."""
    user: UserInfo = request.state.user

    update_data = resume.model_dump(exclude_unset=True)
    update_data["updatedDate"] = datetime.now(timezone.utc)

    updated_doc = await collection.find_one_and_update(
        {"user_id": user.id, "deleted": {"$ne": True}},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    if not updated_doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    index_data = {k: v for k, v in updated_doc.items() if k not in RESUME_INTERNAL_FIELDS}
    schedule_background(_index_resume_background(index_data, user.id))

    return mongo_to_pydantic(updated_doc, ResumeResponse)


@router.post("/resume/restore-original", response_model=ResumeResponse)
@limiter.limit("5/minute")
@requires_auth
async def restore_original_resume(
    request: Request,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Restore the original canonical resume as the active default."""
    user: UserInfo = request.state.user

    current = await collection.find_one({"user_id": user.id, "deleted": {"$ne": True}})
    if not current:
        raise HTTPException(status_code=404, detail="Resume not found")

    original = current.get("original_resume")
    if not original:
        raise HTTPException(status_code=404, detail="No original resume saved")

    update_data = {**original, "updatedDate": datetime.now(timezone.utc)}

    updated_doc = await collection.find_one_and_update(
        {"_id": current["_id"]},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )

    index_data = {k: v for k, v in updated_doc.items() if k not in RESUME_INTERNAL_FIELDS}
    schedule_background(_index_resume_background(index_data, user.id))

    return mongo_to_pydantic(updated_doc, ResumeResponse)


@router.delete("/resume", status_code=204)
@limiter.limit("5/minute")
@requires_auth
async def delete_resume(
    request: Request,
    collection: AsyncIOMotorCollection = Depends(get_resumes_collection),
):
    """Soft delete the current user's resume."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context("Soft deleting resume", {"user_id": user.id})

        result = await collection.update_one(
            {"user_id": user.id, "deleted": {"$ne": True}},
            {"$set": {"deleted": True}},
        )

        if result.matched_count == 0:
            logger.warning_with_context("Resume not found for delete", {"user_id": user.id})
            raise HTTPException(status_code=404, detail="Resume not found")

        logger.info_with_context("Resume soft deleted successfully", {"user_id": user.id})

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting resume",
            {
                "user_id": getattr(request.state, "user", None) and request.state.user.id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while deleting the resume",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
