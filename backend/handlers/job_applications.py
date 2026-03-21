"""API handler for job application tracking."""

from datetime import datetime, timezone
from typing import Optional

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

router = APIRouter(prefix="/applications")


def _doc_to_response(doc: dict) -> JobApplicationResponse:
    return JobApplicationResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        company=doc["company"],
        job_title=doc["job_title"],
        job_url=doc.get("job_url"),
        job_description=doc["job_description"],
        tailored_resume=doc["tailored_resume"],
        evaluation_score=doc["evaluation_score"],
        status=doc["status"],
        notes=doc.get("notes"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


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

    return _doc_to_response(doc)


@router.get("")
@limiter.limit("30/minute")
@requires_auth
async def list_applications(
    request: Request,
    status: Optional[str] = Query(None),
    collection: AsyncIOMotorCollection = Depends(get_job_applications_collection),
):
    """List job applications for the authenticated user."""
    user: UserInfo = request.state.user

    query = {"user_id": user.id}
    if status:
        query["status"] = status

    cursor = collection.find(query).sort("created_at", -1).limit(100)
    results = []
    async for doc in cursor:
        results.append(_doc_to_response(doc))

    return results


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

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
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

    return _doc_to_response(result)


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
