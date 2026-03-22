"""API handler for job application tracking."""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from database import get_job_applications_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.job_application import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdate,
)
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from utils import find_many_and_convert, mongo_to_pydantic

router = APIRouter(prefix="/applications")


@router.post("", response_model=JobApplicationResponse, status_code=201)
@limiter.limit("10/minute")
@requires_auth
async def create_application(
    request: Request,
    body: JobApplicationCreate,
    collection: AsyncIOMotorCollection = Depends(get_job_applications_collection),
):
    """Save a tailored resume as a job application."""
    user: UserInfo = request.state.user
    now = datetime.now(timezone.utc)

    doc = {
        **body.model_dump(),
        "user_id": user.id,
        "created_at": now,
        "updated_at": now,
    }

    result = await collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info_with_context(
        "Job application created",
        {"user_id": user.id, "company": body.company, "job_title": body.job_title},
    )

    return mongo_to_pydantic(doc, JobApplicationResponse)


@router.get("", response_model=List[JobApplicationResponse])
@limiter.limit("30/minute")
@requires_auth
async def list_applications(
    request: Request,
    status: Optional[Literal["saved", "applied", "interviewing", "offered", "rejected"]] = Query(
        None
    ),
    collection: AsyncIOMotorCollection = Depends(get_job_applications_collection),
):
    """List job applications for the authenticated user."""
    user: UserInfo = request.state.user

    query = {"user_id": user.id}
    if status:
        query["status"] = status

    return await find_many_and_convert(
        collection, query, JobApplicationResponse, sort=[("created_at", -1)], limit=100
    )


@router.put("/{application_id}", response_model=JobApplicationResponse)
@limiter.limit("10/minute")
@requires_auth
async def update_application(
    request: Request,
    application_id: str,
    body: JobApplicationUpdate,
    collection: AsyncIOMotorCollection = Depends(get_job_applications_collection),
):
    """Update a job application's status or notes."""
    user: UserInfo = request.state.user

    try:
        oid = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=422, detail="Invalid application ID")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await collection.find_one_and_update(
        {"_id": oid, "user_id": user.id},
        {"$set": update_data},
        return_document=True,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Application not found")

    return mongo_to_pydantic(result, JobApplicationResponse)


@router.delete("/{application_id}", status_code=204)
@limiter.limit("5/minute")
@requires_auth
async def delete_application(
    request: Request,
    application_id: str,
    collection: AsyncIOMotorCollection = Depends(get_job_applications_collection),
):
    """Delete a job application."""
    user: UserInfo = request.state.user

    try:
        oid = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=422, detail="Invalid application ID")

    result = await collection.delete_one({"_id": oid, "user_id": user.id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
