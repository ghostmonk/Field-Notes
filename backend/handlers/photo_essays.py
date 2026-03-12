"""
API handlers for photo essays.
"""

import traceback
from datetime import datetime, timezone

from bson import ObjectId
from database import get_db, get_photo_essays_collection
from decorators.auth import (
    check_write_permission,
    requires_auth,
    verify_auth_and_get_user,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.photo_essay import (
    PhotoEssayCard,
    PhotoEssayCreate,
    PhotoEssayResponse,
    PhotoEssayUpdate,
)
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import ValidationError
from utils import find_many_and_convert, find_one_and_convert, generate_unique_slug

router = APIRouter()


@router.get("/photo-essays/section/{section_id}")
async def get_photo_essays_by_section(
    request: Request,
    section_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_unpublished: bool = Query(False),
    collection: AsyncIOMotorCollection = Depends(get_photo_essays_collection),
):
    """Get photo essays for a section (landing page)."""
    try:
        # Require authentication to view unpublished essays
        if include_unpublished:
            await verify_auth_and_get_user(request)

        query = {"section_id": section_id, "deleted": {"$ne": True}}
        if not include_unpublished:
            query["is_published"] = True
        sort = [("createdDate", -1)]

        logger.info_with_context(
            "Fetching photo essays for section",
            {
                "section_id": section_id,
                "query_params": {"limit": limit, "offset": offset},
            },
        )

        total = await collection.count_documents(query)

        # Projection excludes photos array for listing; include photo_count via aggregation
        projection = {
            "_id": 1,
            "title": 1,
            "description": 1,
            "cover_image_url": 1,
            "cover_image_srcset": 1,
            "cover_image_position": 1,
            "is_published": 1,
            "section_id": 1,
            "createdDate": 1,
            "updatedDate": 1,
            "photo_count": 1,
        }

        essays = await find_many_and_convert(
            collection,
            query,
            PhotoEssayCard,
            sort,
            limit=limit,
            skip=offset,
            projection=projection,
        )

        logger.info_with_context(
            "Successfully fetched photo essays",
            {
                "total_count": total,
                "returned_count": len(essays),
                "pagination": {"limit": limit, "offset": offset},
            },
        )

        return {"items": essays, "total": total, "limit": limit, "offset": offset}

    except Exception as e:
        logger.exception_with_context(
            "Error fetching photo essays",
            {
                "section_id": section_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching photo essays",
        )


@router.get("/photo-essays/{essay_id}", response_model=PhotoEssayResponse)
async def get_photo_essay(
    request: Request,
    essay_id: str,
    collection: AsyncIOMotorCollection = Depends(get_photo_essays_collection),
):
    """Get a single photo essay with all photos."""
    try:
        if not ObjectId.is_valid(essay_id):
            logger.warning_with_context("Invalid photo essay ID format", {"essay_id": essay_id})
            raise HTTPException(status_code=400, detail="Invalid photo essay ID format")

        logger.info_with_context("Fetching photo essay by ID", {"essay_id": essay_id})

        query = {"_id": ObjectId(essay_id), "deleted": {"$ne": True}}

        # Only require is_published for unauthenticated requests
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            query["is_published"] = True
        else:
            try:
                await verify_auth_and_get_user(request)
            except HTTPException:
                query["is_published"] = True

        essay = await find_one_and_convert(
            collection,
            query,
            PhotoEssayResponse,
        )

        if not essay:
            logger.warning_with_context("Photo essay not found", {"essay_id": essay_id})
            raise HTTPException(status_code=404, detail="Photo essay not found")

        logger.info_with_context(
            "Successfully fetched photo essay",
            {"essay_id": essay_id, "title": essay.title},
        )
        return essay

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching photo essay",
            {
                "essay_id": essay_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the photo essay",
        )


@router.post("/photo-essays", response_model=PhotoEssayResponse, status_code=201)
@requires_auth
@limiter.limit("10/minute")
async def create_photo_essay(
    request: Request,
    essay: PhotoEssayCreate,
    collection: AsyncIOMotorCollection = Depends(get_photo_essays_collection),
):
    """Create a new photo essay."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context(
            "Creating new photo essay",
            {
                "title": essay.title,
                "photo_count": len(essay.photos),
                "is_published": essay.is_published,
                "user_id": user.id,
            },
        )

        current_time = datetime.now(timezone.utc)
        slug = await generate_unique_slug(collection, essay.title)

        # Use client-sent section_id; fall back to the default photo_essay section
        section_id = essay.section_id
        if not section_id:
            db = await get_db()
            default_section = await db["sections"].find_one(
                {"content_type": "photo_essay", "is_deleted": {"$ne": True}},
                sort=[("sort_order", 1)],
            )
            if default_section:
                section_id = str(default_section["_id"])

        document = {
            **essay.model_dump(),
            "slug": slug,
            "photo_count": len(essay.photos),
            "createdDate": current_time,
            "updatedDate": current_time,
            "user_id": user.id,
            "section_id": section_id,
        }

        result = await collection.insert_one(document)
        essay_id = str(result.inserted_id)

        logger.info_with_context(
            "Inserted photo essay document",
            {"essay_id": essay_id, "slug": slug},
        )

        created_essay = await find_one_and_convert(
            collection, {"_id": result.inserted_id}, PhotoEssayResponse
        )

        if not created_essay:
            logger.error_with_context(
                "Failed to retrieve created photo essay", {"essay_id": essay_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve created photo essay")

        logger.info_with_context(
            "Photo essay created successfully",
            {"essay_id": essay_id, "title": created_essay.title, "slug": slug},
        )

        return created_essay

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Photo essay validation error during creation",
            {"validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid photo essay data",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error adding photo essay",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "essay_title": getattr(essay, "title", "Unknown"),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail="An error occurred while creating the photo essay",
        )


@router.put("/photo-essays/{essay_id}", response_model=PhotoEssayResponse)
@requires_auth
@limiter.limit("10/minute")
async def update_photo_essay(
    request: Request,
    essay_id: str,
    essay: PhotoEssayUpdate,
    collection: AsyncIOMotorCollection = Depends(get_photo_essays_collection),
):
    """Update a photo essay."""
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(essay_id):
            logger.warning_with_context(
                "Invalid photo essay ID format for update", {"essay_id": essay_id}
            )
            raise HTTPException(status_code=400, detail="Invalid photo essay ID format")

        logger.info_with_context(
            "Updating photo essay",
            {
                "essay_id": essay_id,
                "title": essay.title,
                "user_id": user.id,
            },
        )

        existing = await collection.find_one(
            {"_id": ObjectId(essay_id), "deleted": {"$ne": True}},
            projection={"_id": 1, "user_id": 1, "title": 1},
        )

        if not existing:
            logger.warning_with_context("Photo essay not found for update", {"essay_id": essay_id})
            raise HTTPException(status_code=404, detail="Photo essay not found")

        owner_id = existing.get("user_id")

        # check_write_permission handles None owner_id (only admins can edit)
        if not check_write_permission(user, owner_id):
            logger.warning_with_context(
                "Permission denied for photo essay update",
                {
                    "essay_id": essay_id,
                    "user_id": user.id,
                    "owner_id": owner_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to edit this photo essay"
            )

        current_time = datetime.now(timezone.utc)

        # Build update data from explicitly provided fields
        update_data = essay.model_dump(exclude_unset=True)
        update_data["updatedDate"] = current_time

        # If title changed, regenerate the slug
        if essay.title and existing.get("title") != essay.title:
            update_data["slug"] = await generate_unique_slug(
                collection, essay.title, ObjectId(essay_id)
            )

        # Update photo_count if photos changed
        if "photos" in update_data:
            update_data["photo_count"] = len(update_data["photos"])

        result = await collection.update_one(
            {"_id": ObjectId(essay_id), "deleted": {"$ne": True}}, {"$set": update_data}
        )

        if result.modified_count == 0 and result.matched_count == 0:
            logger.error_with_context(
                "Failed to update photo essay - no documents modified",
                {"essay_id": essay_id},
            )
            raise HTTPException(status_code=500, detail="Failed to update photo essay")

        updated_essay = await find_one_and_convert(
            collection, {"_id": ObjectId(essay_id)}, PhotoEssayResponse
        )

        if not updated_essay:
            logger.error_with_context(
                "Failed to retrieve updated photo essay", {"essay_id": essay_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve updated photo essay")

        logger.info_with_context(
            "Photo essay updated successfully",
            {
                "essay_id": essay_id,
                "title": updated_essay.title,
            },
        )

        return updated_essay

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Photo essay validation error",
            {"essay_id": essay_id, "validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid photo essay data",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error updating photo essay",
            {
                "essay_id": essay_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail="An error occurred while updating the photo essay",
        )


@router.delete("/photo-essays/{essay_id}", status_code=204)
@requires_auth
@limiter.limit("5/minute")
async def delete_photo_essay(
    request: Request,
    essay_id: str,
    collection: AsyncIOMotorCollection = Depends(get_photo_essays_collection),
):
    """Soft delete a photo essay."""
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(essay_id):
            logger.warning_with_context(
                "Invalid photo essay ID format for delete", {"essay_id": essay_id}
            )
            raise HTTPException(status_code=400, detail="Invalid photo essay ID format")

        logger.info_with_context(
            "Soft deleting photo essay", {"essay_id": essay_id, "user_id": user.id}
        )

        existing = await collection.find_one(
            {"_id": ObjectId(essay_id), "deleted": {"$ne": True}},
            projection={"_id": 1, "user_id": 1, "title": 1},
        )

        if not existing:
            logger.warning_with_context("Photo essay not found for delete", {"essay_id": essay_id})
            raise HTTPException(status_code=404, detail="Photo essay not found")

        owner_id = existing.get("user_id")

        # check_write_permission handles None owner_id (only admins can edit)

        if not check_write_permission(user, owner_id):
            logger.warning_with_context(
                "Permission denied for photo essay delete",
                {
                    "essay_id": essay_id,
                    "user_id": user.id,
                    "owner_id": owner_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to delete this photo essay"
            )

        result = await collection.update_one(
            {"_id": ObjectId(essay_id)}, {"$set": {"deleted": True}}
        )

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to delete photo essay",
                {"essay_id": essay_id},
            )
            raise HTTPException(status_code=500, detail="Failed to delete photo essay")

        logger.info_with_context(
            "Photo essay soft deleted successfully",
            {"essay_id": essay_id, "title": existing.get("title")},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting photo essay",
            {
                "essay_id": essay_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail="An error occurred while deleting the photo essay",
        )
