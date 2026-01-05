"""
API handlers for navlinks (hamburger menu links).
"""

import traceback
from datetime import datetime, timezone

from bson import ObjectId
from database import get_navlinks_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from models.navlink import NavLinkCreate, NavLinkResponse, NavLinkUpdate
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import ValidationError
from utils import find_many_and_convert, find_one_and_convert

router = APIRouter()


@router.get("/navlinks")
async def get_navlinks(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_unpublished: bool = Query(False),
    collection: AsyncIOMotorCollection = Depends(get_navlinks_collection),
):
    """Get all navlinks with optional filtering.

    Args:
        limit: Maximum number of navlinks to return (default 20)
        offset: Number of navlinks to skip (default 0)
        include_unpublished: Include unpublished navlinks (default False)
    """
    try:
        query = {}
        if not include_unpublished:
            query["is_published"] = True

        sort = [("sort_order", 1), ("createdDate", -1)]

        logger.info_with_context(
            "Fetching navlinks",
            {
                "query_params": {
                    "limit": limit,
                    "offset": offset,
                    "include_unpublished": include_unpublished,
                },
                "filter": query,
            },
        )

        total = await collection.count_documents(query)

        navlinks = await find_many_and_convert(
            collection,
            query,
            NavLinkResponse,
            sort,
            limit=limit,
            skip=offset,
        )

        logger.info_with_context(
            "Successfully fetched navlinks",
            {
                "total_count": total,
                "returned_count": len(navlinks),
                "pagination": {"limit": limit, "offset": offset},
            },
        )

        return {"items": navlinks, "total": total, "limit": limit, "offset": offset}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching navlinks",
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
                "message": "An error occurred while fetching navlinks",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/navlinks/{navlink_id}", response_model=NavLinkResponse)
async def get_navlink(
    request: Request,
    navlink_id: str,
    collection: AsyncIOMotorCollection = Depends(get_navlinks_collection),
):
    """Get a navlink by ID."""
    try:
        if not ObjectId.is_valid(navlink_id):
            logger.warning_with_context("Invalid navlink ID format", {"navlink_id": navlink_id})
            raise HTTPException(status_code=400, detail="Invalid navlink ID format")

        logger.info_with_context("Fetching navlink by ID", {"navlink_id": navlink_id})

        navlink = await find_one_and_convert(
            collection,
            {"_id": ObjectId(navlink_id)},
            NavLinkResponse,
        )

        if not navlink:
            logger.warning_with_context("NavLink not found", {"navlink_id": navlink_id})
            raise HTTPException(status_code=404, detail="NavLink not found")

        logger.info_with_context(
            "Successfully fetched navlink",
            {"navlink_id": navlink_id, "label": navlink.label},
        )
        return navlink

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching navlink",
            {
                "navlink_id": navlink_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the navlink",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.post("/navlinks", response_model=NavLinkResponse, status_code=201)
@requires_auth
async def create_navlink(
    request: Request,
    navlink: NavLinkCreate,
    collection: AsyncIOMotorCollection = Depends(get_navlinks_collection),
):
    """Create a new navlink.

    Args:
        navlink: NavLink data to create

    Returns:
        The created navlink
    """
    try:
        logger.info_with_context(
            "Creating new navlink",
            {
                "label": navlink.label,
                "url": navlink.url,
            },
        )

        current_time = datetime.now(timezone.utc)

        document = {
            **navlink.model_dump(),
            "createdDate": current_time,
            "updatedDate": current_time,
        }

        result = await collection.insert_one(document)
        navlink_id = str(result.inserted_id)
        logger.info_with_context("Inserted navlink document", {"navlink_id": navlink_id})

        created_navlink = await find_one_and_convert(
            collection, {"_id": result.inserted_id}, NavLinkResponse
        )

        if not created_navlink:
            logger.error_with_context(
                "Failed to retrieve created navlink", {"navlink_id": navlink_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve created navlink")

        logger.info_with_context(
            "NavLink created successfully",
            {
                "navlink_id": navlink_id,
                "label": created_navlink.label,
            },
        )

        return created_navlink

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "NavLink validation error during creation", {"validation_errors": error_details}
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid navlink data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error creating navlink",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "navlink_label": getattr(navlink, "label", "Unknown"),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while creating the navlink",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.put("/navlinks/{navlink_id}", response_model=NavLinkResponse)
@requires_auth
async def update_navlink(
    request: Request,
    navlink_id: str,
    navlink: NavLinkUpdate,
    collection: AsyncIOMotorCollection = Depends(get_navlinks_collection),
):
    """Update a navlink.

    Args:
        navlink_id: The navlink ID to update
        navlink: NavLink data with only fields to update

    Returns:
        The updated navlink
    """
    try:
        if not ObjectId.is_valid(navlink_id):
            logger.warning_with_context(
                "Invalid navlink ID format for update", {"navlink_id": navlink_id}
            )
            raise HTTPException(status_code=400, detail="Invalid navlink ID format")

        logger.info_with_context(
            "Updating navlink",
            {"navlink_id": navlink_id},
        )

        existing_navlink = await find_one_and_convert(
            collection, {"_id": ObjectId(navlink_id)}, NavLinkResponse
        )

        if not existing_navlink:
            logger.warning_with_context("NavLink not found for update", {"navlink_id": navlink_id})
            raise HTTPException(status_code=404, detail="NavLink not found")

        current_time = datetime.now(timezone.utc)

        # Get only the fields that were actually provided (not None)
        update_data = navlink.model_dump(exclude_unset=True)
        update_data["updatedDate"] = current_time

        result = await collection.update_one({"_id": ObjectId(navlink_id)}, {"$set": update_data})

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to update navlink - no documents modified",
                {
                    "navlink_id": navlink_id,
                    "matched_count": result.matched_count,
                    "modified_count": result.modified_count,
                },
            )
            raise HTTPException(status_code=500, detail="Failed to update navlink")

        updated_navlink = await find_one_and_convert(
            collection, {"_id": ObjectId(navlink_id)}, NavLinkResponse
        )

        if not updated_navlink:
            logger.error_with_context(
                "Failed to retrieve updated navlink", {"navlink_id": navlink_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve updated navlink")

        logger.info_with_context(
            "NavLink updated successfully",
            {
                "navlink_id": navlink_id,
                "label": updated_navlink.label,
            },
        )

        return updated_navlink

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "NavLink validation error",
            {"navlink_id": navlink_id, "validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid navlink data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error updating navlink",
            {
                "navlink_id": navlink_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )

        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while updating the navlink",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.delete("/navlinks/{navlink_id}", status_code=204)
@requires_auth
async def delete_navlink(
    request: Request,
    navlink_id: str,
    collection: AsyncIOMotorCollection = Depends(get_navlinks_collection),
):
    """Hard delete a navlink.

    Args:
        navlink_id: The navlink ID to delete

    Returns:
        204 No Content on success
    """
    try:
        if not ObjectId.is_valid(navlink_id):
            logger.warning_with_context(
                "Invalid navlink ID format for delete", {"navlink_id": navlink_id}
            )
            raise HTTPException(status_code=400, detail="Invalid navlink ID format")

        logger.info_with_context("Deleting navlink", {"navlink_id": navlink_id})

        existing_navlink = await find_one_and_convert(
            collection, {"_id": ObjectId(navlink_id)}, NavLinkResponse
        )

        if not existing_navlink:
            logger.warning_with_context("NavLink not found for delete", {"navlink_id": navlink_id})
            raise HTTPException(status_code=404, detail="NavLink not found")

        result = await collection.delete_one({"_id": ObjectId(navlink_id)})

        if result.deleted_count == 0:
            logger.error_with_context(
                "Failed to delete navlink - no documents deleted",
                {
                    "navlink_id": navlink_id,
                    "deleted_count": result.deleted_count,
                },
            )
            raise HTTPException(status_code=500, detail="Failed to delete navlink")

        logger.info_with_context(
            "NavLink deleted successfully",
            {"navlink_id": navlink_id, "label": existing_navlink.label},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting navlink",
            {
                "navlink_id": navlink_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )

        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while deleting the navlink",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
