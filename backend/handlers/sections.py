"""
API handlers for sections (dynamic site structure).
"""

import traceback

from bson import ObjectId
from database import get_sections_collection
from decorators.auth import requires_auth, verify_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from models.section import SectionResponse
from motor.motor_asyncio import AsyncIOMotorCollection
from utils import find_many_and_convert, find_one_and_convert

router = APIRouter()


@router.get("/sections")
async def get_sections(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    parent_id: str | None = Query(None),
    nav_visibility: str | None = Query(None),
    include_unpublished: bool = Query(False),
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Get all sections with optional filtering.

    Args:
        limit: Maximum number of sections to return (default 20)
        offset: Number of sections to skip (default 0)
        parent_id: Filter by parent section ID (for nested sections)
        nav_visibility: Filter by navigation visibility ('main', 'secondary', 'hidden')
        include_unpublished: Include unpublished sections (requires auth)
    """
    try:
        # Require authentication to view unpublished sections
        if include_unpublished:
            await verify_auth(request)

        query = {"deleted": {"$ne": True}}
        if not include_unpublished:
            query["is_published"] = True
        if parent_id is not None:
            query["parent_id"] = parent_id
        if nav_visibility is not None:
            query["nav_visibility"] = nav_visibility

        sort = [("sort_order", 1), ("createdDate", -1)]

        logger.info_with_context(
            "Fetching sections",
            {
                "query_params": {
                    "limit": limit,
                    "offset": offset,
                    "parent_id": parent_id,
                    "nav_visibility": nav_visibility,
                },
                "filter": query,
            },
        )

        total = await collection.count_documents(query)

        sections = await find_many_and_convert(
            collection,
            query,
            SectionResponse,
            sort,
            limit=limit,
            skip=offset,
        )

        logger.info_with_context(
            "Successfully fetched sections",
            {
                "total_count": total,
                "returned_count": len(sections),
                "pagination": {"limit": limit, "offset": offset},
            },
        )

        return {"items": sections, "total": total, "limit": limit, "offset": offset}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching sections",
            {
                "query_params": {"limit": limit, "offset": offset},
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching sections",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/sections/by-slug/{slug}", response_model=SectionResponse)
async def get_section_by_slug(
    request: Request,
    slug: str,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Get a section by its slug (public endpoint)."""
    try:
        logger.info_with_context("Fetching section by slug", {"slug": slug})

        section = await find_one_and_convert(
            collection,
            {"slug": slug, "deleted": {"$ne": True}, "is_published": True},
            SectionResponse,
        )

        if not section:
            logger.warning_with_context("Section not found by slug", {"slug": slug})
            raise HTTPException(status_code=404, detail="Section not found")

        logger.info_with_context(
            "Successfully fetched section by slug",
            {"slug": slug, "title": section.title},
        )
        return section

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching section by slug",
            {
                "slug": slug,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the section",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/sections/{section_id}", response_model=SectionResponse)
@requires_auth
async def get_section(
    request: Request,
    section_id: str,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Get a section by ID (admin use, requires auth)."""
    try:
        if not ObjectId.is_valid(section_id):
            logger.warning_with_context("Invalid section ID format", {"section_id": section_id})
            raise HTTPException(status_code=400, detail="Invalid section ID format")

        logger.info_with_context("Fetching section by ID", {"section_id": section_id})

        section = await find_one_and_convert(
            collection,
            {"_id": ObjectId(section_id), "deleted": {"$ne": True}},
            SectionResponse,
        )

        if not section:
            logger.warning_with_context("Section not found", {"section_id": section_id})
            raise HTTPException(status_code=404, detail="Section not found")

        logger.info_with_context(
            "Successfully fetched section",
            {"section_id": section_id, "title": section.title},
        )
        return section

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching section",
            {
                "section_id": section_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the section",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
