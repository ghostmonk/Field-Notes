from typing import Literal

from database import get_db
from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Request
from models.version import ContentVersion

router = APIRouter(prefix="/versions", tags=["versions"])


@router.get("/{content_type}/{content_id}")
@requires_auth
async def list_versions(
    request: Request,
    content_type: Literal["story", "project", "page"],
    content_id: str,
):
    db = await get_db()
    versions = []
    async for doc in (
        db.content_versions.find(
            {"content_type": content_type, "content_id": content_id},
        )
        .sort("version", -1)
        .limit(50)
    ):
        doc["_id"] = str(doc["_id"])
        versions.append(ContentVersion(**doc).model_dump())
    return {"versions": versions, "total": len(versions)}


@router.get("/{content_type}/{content_id}/{version}")
@requires_auth
async def get_version(
    request: Request,
    content_type: Literal["story", "project", "page"],
    content_id: str,
    version: int,
):
    db = await get_db()
    doc = await db.content_versions.find_one(
        {
            "content_type": content_type,
            "content_id": content_id,
            "version": version,
        }
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Version not found")
    doc["_id"] = str(doc["_id"])
    return ContentVersion(**doc).model_dump()
