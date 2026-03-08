"""
API handlers for portfolio projects.
"""

import traceback
from datetime import datetime, timezone

from bson import ObjectId
from database import get_db, get_projects_collection
from decorators.auth import check_write_permission, requires_auth, verify_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from models.project import ProjectCard, ProjectCreate, ProjectResponse, ProjectUpdate
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import ValidationError
from utils import find_many_and_convert, find_one_and_convert, generate_unique_slug

router = APIRouter()


@router.get("/projects")
async def get_projects(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_unpublished: bool = Query(False),
    featured_only: bool = Query(False),
    section_id: str | None = Query(None),
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Get all projects as cards for listing."""
    try:
        # Require authentication to view unpublished projects
        if include_unpublished:
            await verify_auth(request)

        query = {"deleted": {"$ne": True}}
        if not include_unpublished:
            query["is_published"] = True
        if featured_only:
            query["is_featured"] = True
        if section_id:
            query["section_id"] = section_id

        sort = [("sort_order", 1), ("createdDate", -1)]

        logger.info_with_context(
            "Fetching projects",
            {
                "query_params": {"limit": limit, "offset": offset, "featured_only": featured_only},
                "filter": query,
            },
        )

        total = await collection.count_documents(query)

        # Projection for card data only
        projection = {
            "_id": 1,
            "title": 1,
            "slug": 1,
            "summary": 1,
            "technologies": 1,
            "image_url": 1,
            "github_url": 1,
            "live_url": 1,
            "is_featured": 1,
            "user_id": 1,
            "section_id": 1,
        }

        projects = await find_many_and_convert(
            collection,
            query,
            ProjectCard,
            sort,
            limit=limit,
            skip=offset,
            projection=projection,
        )

        logger.info_with_context(
            "Successfully fetched projects",
            {
                "total_count": total,
                "returned_count": len(projects),
                "pagination": {"limit": limit, "offset": offset},
            },
        )

        return {"items": projects, "total": total, "limit": limit, "offset": offset}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching projects",
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
                "message": "An error occurred while fetching projects",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/projects/slug/{slug}", response_model=ProjectResponse)
async def get_project_by_slug(
    request: Request,
    slug: str,
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Get a project by slug for detail page."""
    try:
        logger.info_with_context("Fetching project by slug", {"slug": slug})

        project = await find_one_and_convert(
            collection,
            {"slug": slug, "deleted": {"$ne": True}, "is_published": True},
            ProjectResponse,
        )

        if not project:
            logger.warning_with_context("Project not found by slug", {"slug": slug})
            raise HTTPException(status_code=404, detail="Project not found")

        logger.info_with_context(
            "Successfully fetched project by slug",
            {"slug": slug, "title": project.title},
        )
        return project

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching project by slug",
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
                "message": "An error occurred while fetching the project",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
@requires_auth
async def get_project(
    request: Request,
    project_id: str,
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Get a project by ID (admin use)."""
    try:
        if not ObjectId.is_valid(project_id):
            logger.warning_with_context("Invalid project ID format", {"project_id": project_id})
            raise HTTPException(status_code=400, detail="Invalid project ID format")

        logger.info_with_context("Fetching project by ID", {"project_id": project_id})

        project = await find_one_and_convert(
            collection,
            {"_id": ObjectId(project_id), "deleted": {"$ne": True}},
            ProjectResponse,
        )

        if not project:
            logger.warning_with_context("Project not found", {"project_id": project_id})
            raise HTTPException(status_code=404, detail="Project not found")

        logger.info_with_context(
            "Successfully fetched project",
            {"project_id": project_id, "title": project.title},
        )
        return project

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching project",
            {
                "project_id": project_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching the project",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.post("/projects", response_model=ProjectResponse, status_code=201)
@requires_auth
async def create_project(
    request: Request,
    project: ProjectCreate,
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Create a new project."""
    try:
        user: UserInfo = request.state.user

        logger.info_with_context(
            "Creating new project",
            {
                "title": project.title,
                "technologies": project.technologies,
                "is_published": project.is_published,
                "is_featured": project.is_featured,
                "user_id": user.id,
            },
        )

        current_time = datetime.now(timezone.utc)
        slug = await generate_unique_slug(collection, project.title)

        # Use client-sent section_id; fall back to the default project section
        section_id = project.section_id
        if not section_id:
            db = await get_db()
            default_section = await db["sections"].find_one(
                {"content_type": "project", "is_deleted": {"$ne": True}},
                sort=[("sort_order", 1)],
            )
            if default_section:
                section_id = str(default_section["_id"])

        document = {
            **project.model_dump(),
            "slug": slug,
            "createdDate": current_time,
            "updatedDate": current_time,
            "user_id": user.id,
            "section_id": section_id,
        }

        result = await collection.insert_one(document)
        project_id = str(result.inserted_id)

        logger.info_with_context(
            "Inserted project document",
            {"project_id": project_id, "slug": slug},
        )

        created_project = await find_one_and_convert(
            collection, {"_id": result.inserted_id}, ProjectResponse
        )

        if not created_project:
            logger.error_with_context(
                "Failed to retrieve created project", {"project_id": project_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve created project")

        logger.info_with_context(
            "Project created successfully",
            {"project_id": project_id, "title": created_project.title, "slug": slug},
        )

        return created_project

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Project validation error during creation",
            {"validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid project data", "validation_errors": error_details},
        )
    except Exception as e:
        logger.exception_with_context(
            "Error adding project",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "project_title": getattr(project, "title", "Unknown"),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while creating the project",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
@requires_auth
async def update_project(
    request: Request,
    project_id: str,
    project: ProjectUpdate,
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Update a project."""
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(project_id):
            logger.warning_with_context(
                "Invalid project ID format for update", {"project_id": project_id}
            )
            raise HTTPException(status_code=400, detail="Invalid project ID format")

        logger.info_with_context(
            "Updating project",
            {
                "project_id": project_id,
                "title": project.title,
                "user_id": user.id,
            },
        )

        existing_project = await find_one_and_convert(
            collection,
            {"_id": ObjectId(project_id), "deleted": {"$ne": True}},
            ProjectResponse,
        )

        if not existing_project:
            logger.warning_with_context("Project not found for update", {"project_id": project_id})
            raise HTTPException(status_code=404, detail="Project not found")

        # Check write permission
        if not check_write_permission(user, existing_project.user_id):
            logger.warning_with_context(
                "Permission denied for project update",
                {
                    "project_id": project_id,
                    "user_id": user.id,
                    "owner_id": existing_project.user_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to edit this project"
            )

        current_time = datetime.now(timezone.utc)

        # Build update data from non-None fields
        update_data = {k: v for k, v in project.model_dump().items() if v is not None}
        update_data["updatedDate"] = current_time

        # If title changed, regenerate the slug
        if project.title and existing_project.title != project.title:
            update_data["slug"] = await generate_unique_slug(
                collection, project.title, ObjectId(project_id)
            )

        result = await collection.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})

        if result.modified_count == 0 and result.matched_count == 0:
            logger.error_with_context(
                "Failed to update project - no documents modified",
                {"project_id": project_id},
            )
            raise HTTPException(status_code=500, detail="Failed to update project")

        # Save version snapshot (non-critical — don't fail the update)
        try:
            from handlers.versions import save_version

            await save_version(
                content_id=project_id,
                content_type="project",
                title=update_data.get("title", existing_project.title),
                content=update_data.get("content", existing_project.content or ""),
                user_id=user.id,
            )
        except Exception as version_err:
            logger.warning(
                f"Failed to save version snapshot for project {project_id}: {version_err}"
            )

        updated_project = await find_one_and_convert(
            collection, {"_id": ObjectId(project_id)}, ProjectResponse
        )

        if not updated_project:
            logger.error_with_context(
                "Failed to retrieve updated project", {"project_id": project_id}
            )
            raise HTTPException(status_code=500, detail="Failed to retrieve updated project")

        logger.info_with_context(
            "Project updated successfully",
            {
                "project_id": project_id,
                "title": updated_project.title,
                "slug": updated_project.slug,
            },
        )

        return updated_project

    except ValidationError as e:
        error_details = e.errors() if hasattr(e, "errors") else str(e)
        logger.error_with_context(
            "Project validation error",
            {"project_id": project_id, "validation_errors": error_details},
        )
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid project data", "validation_errors": error_details},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error updating project",
            {
                "project_id": project_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while updating the project",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.delete("/projects/{project_id}", status_code=204)
@requires_auth
async def delete_project(
    request: Request,
    project_id: str,
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    """Soft delete a project."""
    try:
        user: UserInfo = request.state.user

        if not ObjectId.is_valid(project_id):
            logger.warning_with_context(
                "Invalid project ID format for delete", {"project_id": project_id}
            )
            raise HTTPException(status_code=400, detail="Invalid project ID format")

        logger.info_with_context(
            "Soft deleting project", {"project_id": project_id, "user_id": user.id}
        )

        existing_project = await find_one_and_convert(
            collection,
            {"_id": ObjectId(project_id), "deleted": {"$ne": True}},
            ProjectResponse,
        )

        if not existing_project:
            logger.warning_with_context("Project not found for delete", {"project_id": project_id})
            raise HTTPException(status_code=404, detail="Project not found")

        # Check write permission
        if not check_write_permission(user, existing_project.user_id):
            logger.warning_with_context(
                "Permission denied for project delete",
                {
                    "project_id": project_id,
                    "user_id": user.id,
                    "owner_id": existing_project.user_id,
                },
            )
            raise HTTPException(
                status_code=403, detail="You don't have permission to delete this project"
            )

        result = await collection.update_one(
            {"_id": ObjectId(project_id)}, {"$set": {"deleted": True}}
        )

        if result.modified_count == 0:
            logger.error_with_context(
                "Failed to delete project",
                {"project_id": project_id},
            )
            raise HTTPException(status_code=500, detail="Failed to delete project")

        logger.info_with_context(
            "Project soft deleted successfully",
            {"project_id": project_id, "title": existing_project.title},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting project",
            {
                "project_id": project_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        logger.log_request_response(request, error=e)

        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while deleting the project",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
