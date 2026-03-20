"""
API handlers for resume builder.
"""

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
from utils import find_one_and_convert, mongo_to_pydantic

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
        resume = mongo_to_pydantic(doc, ResumePublicResponse) if doc else None

        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        return resume

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

        # Single query: find any resume for this user (active or deleted)
        existing = await collection.find_one({"user_id": user.id})

        if existing and existing.get("deleted") is not True:
            logger.warning_with_context(
                "Resume already exists for user",
                {"user_id": user.id},
            )
            raise HTTPException(status_code=409, detail="Resume already exists for this user")

        # Reuse soft-deleted doc if present, otherwise insert new
        deleted_resume = existing if existing and existing.get("deleted") is True else None

        if deleted_resume:
            # Atomic: find soft-deleted doc and reactivate it in one operation
            reactivated = await collection.find_one_and_update(
                {"user_id": user.id, "deleted": True},
                {
                    "$set": {
                        **resume.model_dump(),
                        "updatedDate": current_time,
                        "createdDate": current_time,
                        "deleted": False,
                        "user_id": user.id,
                    }
                },
                return_document=ReturnDocument.AFTER,
            )
            created_resume = mongo_to_pydantic(reactivated, ResumeResponse)
        else:
            document = {
                **resume.model_dump(),
                "createdDate": current_time,
                "updatedDate": current_time,
                "user_id": user.id,
            }
            result = await collection.insert_one(document)
            created_resume = await find_one_and_convert(
                collection, {"_id": result.inserted_id}, ResumeResponse
            )

        if not created_resume:
            logger.error_with_context("Failed to retrieve created resume", {"user_id": user.id})
            raise HTTPException(status_code=500, detail="Failed to retrieve created resume")

        logger.info_with_context(
            "Resume created successfully",
            {"user_id": user.id},
        )

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

        result = await collection.update_one(
            {"user_id": user.id, "deleted": {"$ne": True}},
            {"$set": update_data},
        )

        if result.matched_count == 0:
            logger.warning_with_context("Resume not found for update", {"user_id": user.id})
            raise HTTPException(status_code=404, detail="Resume not found")

        updated_resume = await find_one_and_convert(
            collection,
            {"user_id": user.id, "deleted": {"$ne": True}},
            ResumeResponse,
        )

        logger.info_with_context("Resume updated successfully", {"user_id": user.id})
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
