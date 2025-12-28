"""
API handlers for static pages (About, Contact).
"""

import traceback
from datetime import datetime, timezone

from database import get_pages_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from models.page import PageCreate, PageResponse, PageType, PageUpdate
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import ValidationError
from utils import find_one_and_convert

router = APIRouter()


@router.get("/pages/{page_type}", response_model=PageResponse)
async def get_page(
    request: Request,
    page_type: PageType,
    collection: AsyncIOMotorCollection = Depends(get_pages_collection),
):
    """Get a page by type (about or contact)."""
    try:
        logger.info_with_context("Fetching page", {"page_type": page_type})

        page = await find_one_and_convert(
            collection,
            {"page_type": page_type, "deleted": {"$ne": True}},
            PageResponse,
        )

        if not page:
            logger.warning_with_context("Page not found", {"page_type": page_type})
            raise HTTPException(status_code=404, detail=f"Page '{page_type}' not found")

        logger.info_with_context(
            "Successfully fetched page", {"page_type": page_type, "title": page.title}
        )
        return page

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching page",
            {
                "page_type": page_type,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the page",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.put("/pages/{page_type}", response_model=PageResponse)
@requires_auth
async def upsert_page(
    request: Request,
    page_type: PageType,
    page: PageUpdate,
    collection: AsyncIOMotorCollection = Depends(get_pages_collection),
):
    """Create or update a page by type."""
    try:
        logger.info_with_context(
            "Upserting page",
            {
                "page_type": page_type,
                "title": page.title,
                "content_length": len(page.content) if page.content else 0,
            },
        )

        current_time = datetime.now(timezone.utc)

        # Check if page exists
        existing_page = await find_one_and_convert(
            collection,
            {"page_type": page_type, "deleted": {"$ne": True}},
            PageResponse,
        )

        if existing_page:
            # Update existing page
            update_data = {
                k: v for k, v in page.model_dump().items() if v is not None
            }
            update_data["updatedDate"] = current_time

            result = await collection.update_one(
                {"page_type": page_type, "deleted": {"$ne": True}},
                {"$set": update_data},
            )

            if result.modified_count == 0 and result.matched_count == 0:
                logger.error_with_context(
                    "Failed to update page", {"page_type": page_type}
                )
                raise HTTPException(status_code=500, detail="Failed to update page")

            logger.info_with_context(
                "Page updated successfully", {"page_type": page_type}
            )
        else:
            # Create new page
            if not page.title or not page.content:
                raise HTTPException(
                    status_code=400,
                    detail="Title and content are required for creating a new page",
                )

            document = {
                "title": page.title,
                "content": page.content,
                "page_type": page_type,
                "is_published": page.is_published if page.is_published is not None else True,
                "createdDate": current_time,
                "updatedDate": current_time,
            }

            result = await collection.insert_one(document)
            logger.info_with_context(
                "Page created successfully",
                {"page_type": page_type, "id": str(result.inserted_id)},
            )

        # Return the updated/created page
        updated_page = await find_one_and_convert(
            collection,
            {"page_type": page_type, "deleted": {"$ne": True}},
            PageResponse,
        )

        if not updated_page:
            raise HTTPException(status_code=500, detail="Failed to retrieve page")

        return updated_page

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Page validation error",
            {"page_type": page_type, "validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid page data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error upserting page",
            {
                "page_type": page_type,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while saving the page",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.delete("/pages/{page_type}", status_code=204)
@requires_auth
async def delete_page(
    request: Request,
    page_type: PageType,
    collection: AsyncIOMotorCollection = Depends(get_pages_collection),
):
    """Soft delete a page."""
    try:
        logger.info_with_context("Soft deleting page", {"page_type": page_type})

        existing_page = await find_one_and_convert(
            collection,
            {"page_type": page_type, "deleted": {"$ne": True}},
            PageResponse,
        )

        if not existing_page:
            logger.warning_with_context("Page not found for delete", {"page_type": page_type})
            raise HTTPException(status_code=404, detail="Page not found")

        result = await collection.update_one(
            {"page_type": page_type, "deleted": {"$ne": True}},
            {"$set": {"deleted": True}},
        )

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to delete page", {"page_type": page_type}
            )
            raise HTTPException(status_code=500, detail="Failed to delete page")

        logger.info_with_context(
            "Page soft deleted successfully",
            {"page_type": page_type, "title": existing_page.title},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting page",
            {
                "page_type": page_type,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while deleting the page",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
