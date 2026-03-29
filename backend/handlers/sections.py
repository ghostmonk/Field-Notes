"""
API handlers for sections (dynamic site structure).
"""

import traceback
from datetime import datetime, timezone

from bson import ObjectId
from database import get_sections_collection
from decorators.auth import check_write_permission, requires_auth, verify_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.section import SectionCreate, SectionResponse, SectionUpdate
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError
from services.redirects import write_redirect
from utils import find_many_and_convert, find_one_and_convert, generate_unique_slug

router = APIRouter()


async def cascade_path_updates(
    collection: AsyncIOMotorCollection,
    section_id: str,
    new_path: str,
    visited: set | None = None,
):
    """Recursively update paths of all descendant sections."""
    if visited is None:
        visited = set()
    if section_id in visited:
        return
    visited.add(section_id)
    children = await collection.find({"parent_id": section_id, "deleted": {"$ne": True}}).to_list(
        None
    )

    for child in children:
        child_new_path = f"{new_path}/{child['slug']}"
        await collection.update_one(
            {"_id": child["_id"]},
            {"$set": {"path": child_new_path, "updatedDate": datetime.now(timezone.utc)}},
        )
        await cascade_path_updates(collection, str(child["_id"]), child_new_path, visited)


async def _collect_all_descendant_paths(
    collection: AsyncIOMotorCollection,
    section_id: str,
    paths: dict,
    visited: set | None = None,
):
    """Recursively collect paths of all descendant sections."""
    if visited is None:
        visited = set()
    if section_id in visited:
        return
    visited.add(section_id)
    children = await collection.find({"parent_id": section_id, "deleted": {"$ne": True}}).to_list(
        None
    )
    for child in children:
        child_id = str(child["_id"])
        paths[child_id] = child.get("path", "")
        await _collect_all_descendant_paths(collection, child_id, paths, visited)


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
            if parent_id != "null" and not ObjectId.is_valid(parent_id):
                raise HTTPException(status_code=400, detail="Invalid parent_id format")
            query["parent_id"] = parent_id
        if nav_visibility is not None:
            allowed = {"main", "secondary", "hidden"}
            if nav_visibility not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid nav_visibility. Must be one of: {', '.join(sorted(allowed))}",
                )
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
async def get_section(
    request: Request,
    section_id: str,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Get a section by ID (public endpoint, same as by-slug)."""
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


@router.post("/sections", response_model=SectionResponse, status_code=201)
@limiter.limit("10/minute")
@requires_auth
async def create_section(
    request: Request,
    section: SectionCreate,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Create a new section.

    Args:
        section: Section data to create

    Returns:
        The created section
    """
    try:
        user: UserInfo = request.state.user

        logger.info_with_context(
            "Creating new section",
            {
                "title": section.title,
                "display_type": section.display_type,
                "user_id": user.id,
            },
        )

        current_time = datetime.now(timezone.utc)

        # Generate a unique slug for the new section
        slug = await generate_unique_slug(collection, section.title)

        # Compute materialized path from parent
        if section.parent_id:
            if not ObjectId.is_valid(section.parent_id):
                raise HTTPException(status_code=400, detail="Invalid parent_id format")
            parent = await find_one_and_convert(
                collection,
                {"_id": ObjectId(section.parent_id), "deleted": {"$ne": True}},
                SectionResponse,
            )
            if not parent:
                raise HTTPException(status_code=400, detail="Parent section not found")
            path = f"{parent.path}/{slug}"
        else:
            path = slug

        document = {
            **section.model_dump(),
            "slug": slug,
            "path": path,
            "createdDate": current_time,
            "updatedDate": current_time,
            "user_id": user.id,
        }

        result = await collection.insert_one(document)
        section_id = str(result.inserted_id)
        logger.info_with_context(
            "Inserted section document", {"section_id": section_id, "slug": slug}
        )

        created_section = await find_one_and_convert(
            collection, {"_id": result.inserted_id}, SectionResponse
        )

        if not created_section:
            logger.error_with_context(
                "Failed to retrieve created section", {"section_id": section_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve created section")

        logger.info_with_context(
            "Section created successfully",
            {
                "section_id": section_id,
                "title": created_section.title,
                "slug": created_section.slug,
            },
        )

        return created_section

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Section validation error during creation", {"validation_errors": error_details}
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid section data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error creating section",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "section_title": getattr(section, "title", "Unknown"),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while creating the section",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.put("/sections/{section_id}", response_model=SectionResponse)
@limiter.limit("10/minute")
@requires_auth
async def update_section(
    request: Request,
    section_id: str,
    section: SectionUpdate,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Update a section.

    Args:
        section_id: The section ID to update
        section: Section data with only fields to update

    Returns:
        The updated section
    """
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(section_id):
            logger.warning_with_context(
                "Invalid section ID format for update", {"section_id": section_id}
            )
            raise HTTPException(status_code=400, detail="Invalid section ID format")

        logger.info_with_context(
            "Updating section",
            {
                "section_id": section_id,
                "user_id": user.id,
            },
        )

        existing_section = await find_one_and_convert(
            collection, {"_id": ObjectId(section_id), "deleted": {"$ne": True}}, SectionResponse
        )

        if not existing_section:
            logger.warning_with_context("Section not found for update", {"section_id": section_id})
            raise HTTPException(status_code=404, detail="Section not found")

        # Check write permission
        if not check_write_permission(user, existing_section.user_id):
            logger.warning_with_context(
                "Permission denied for section update",
                {
                    "section_id": section_id,
                    "user_id": user.id,
                    "owner_id": existing_section.user_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to edit this section"
            )

        current_time = datetime.now(timezone.utc)

        # Get only the fields that were actually provided (not None)
        update_data = section.model_dump(exclude_unset=True)

        # If title changed, regenerate the slug and recompute path
        if "title" in update_data and update_data["title"] != existing_section.title:
            new_slug = await generate_unique_slug(
                collection, update_data["title"], ObjectId(section_id)
            )
            update_data["slug"] = new_slug

            # Recompute path based on parent
            if existing_section.parent_id:
                parent = await find_one_and_convert(
                    collection,
                    {
                        "_id": ObjectId(existing_section.parent_id),
                        "deleted": {"$ne": True},
                    },
                    SectionResponse,
                )
                if parent:
                    update_data["path"] = f"{parent.path}/{new_slug}"
                else:
                    update_data["path"] = new_slug
            else:
                update_data["path"] = new_slug
        elif "slug" in update_data and update_data["slug"] != existing_section.slug:
            new_slug = update_data["slug"]
            if existing_section.parent_id:
                parent = await find_one_and_convert(
                    collection,
                    {
                        "_id": ObjectId(existing_section.parent_id),
                        "deleted": {"$ne": True},
                    },
                    SectionResponse,
                )
                if parent:
                    update_data["path"] = f"{parent.path}/{new_slug}"
                else:
                    update_data["path"] = new_slug
            else:
                update_data["path"] = new_slug

        update_data["updatedDate"] = current_time

        try:
            result = await collection.update_one(
                {"_id": ObjectId(section_id)}, {"$set": update_data}
            )
        except DuplicateKeyError:
            raise HTTPException(
                status_code=409,
                detail="A section with this slug already exists at this level",
            )

        # Cascade path updates and write redirects if path changed
        if "path" in update_data and update_data["path"] != existing_section.path:
            old_path = existing_section.path
            new_path = update_data["path"]

            # Collect ALL old descendant paths before cascade (recursive)
            old_desc_paths = {section_id: old_path}
            await _collect_all_descendant_paths(collection, section_id, old_desc_paths)

            await cascade_path_updates(collection, section_id, new_path)

            # Write redirects (non-critical — don't fail the rename)
            try:
                db = collection.database
                for sid, old_p in old_desc_paths.items():
                    doc = await collection.find_one({"_id": ObjectId(sid)})
                    new_p = doc.get("path", new_path) if doc else new_path
                    if old_p != new_p:
                        await write_redirect(db, old_p, new_p)
            except Exception as redirect_err:
                logger.warning(f"Failed to write redirects for section rename: {redirect_err}")

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to update section - no documents modified",
                {
                    "section_id": section_id,
                    "matched_count": result.matched_count,
                    "modified_count": result.modified_count,
                },
            )
            raise HTTPException(status_code=500, detail="Failed to update section")

        updated_section = await find_one_and_convert(
            collection, {"_id": ObjectId(section_id)}, SectionResponse
        )

        if not updated_section:
            logger.error_with_context(
                "Failed to retrieve updated section", {"section_id": section_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve updated section")

        logger.info_with_context(
            "Section updated successfully",
            {
                "section_id": section_id,
                "title": updated_section.title,
                "slug": updated_section.slug,
            },
        )

        return updated_section

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Section validation error",
            {"section_id": section_id, "validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid section data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error updating section",
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
            detail={
                "message": "An error occurred while updating the section",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.delete("/sections/{section_id}", status_code=204)
@limiter.limit("5/minute")
@requires_auth
async def delete_section(
    request: Request,
    section_id: str,
    collection: AsyncIOMotorCollection = Depends(get_sections_collection),
):
    """Soft delete a section.

    Args:
        section_id: The section ID to delete

    Returns:
        204 No Content on success
    """
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(section_id):
            logger.warning_with_context(
                "Invalid section ID format for delete", {"section_id": section_id}
            )
            raise HTTPException(status_code=400, detail="Invalid section ID format")

        logger.info_with_context(
            "Soft deleting section", {"section_id": section_id, "user_id": user.id}
        )

        existing_section = await find_one_and_convert(
            collection, {"_id": ObjectId(section_id), "deleted": {"$ne": True}}, SectionResponse
        )

        if not existing_section:
            logger.warning_with_context("Section not found for delete", {"section_id": section_id})
            raise HTTPException(status_code=404, detail="Section not found")

        # Check write permission
        if not check_write_permission(user, existing_section.user_id):
            logger.warning_with_context(
                "Permission denied for section delete",
                {
                    "section_id": section_id,
                    "user_id": user.id,
                    "owner_id": existing_section.user_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to delete this section"
            )

        result = await collection.update_one(
            {"_id": ObjectId(section_id)}, {"$set": {"deleted": True}}
        )

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to delete section - no documents modified",
                {
                    "section_id": section_id,
                    "matched_count": result.matched_count,
                    "modified_count": result.modified_count,
                },
            )
            raise HTTPException(status_code=500, detail="Failed to delete section")

        logger.info_with_context(
            "Section soft deleted successfully",
            {"section_id": section_id, "title": existing_section.title},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting section",
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
            detail={
                "message": "An error occurred while deleting the section",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
