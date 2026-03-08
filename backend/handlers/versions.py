from datetime import datetime, timezone

from database import get_db
from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/versions", tags=["versions"])


async def save_version(
    content_id: str,
    content_type: str,
    title: str,
    content: str,
    user_id: str,
    metadata: dict | None = None,
):
    """Save a new version snapshot. Called from story/project update handlers."""
    db = await get_db()
    # Get next version number
    latest = await db.content_versions.find_one(
        {"content_id": content_id, "content_type": content_type},
        sort=[("version", -1)],
    )
    version_num = (latest["version"] + 1) if latest else 1

    await db.content_versions.insert_one(
        {
            "content_id": content_id,
            "content_type": content_type,
            "version": version_num,
            "title": title,
            "content": content,
            "metadata": metadata or {},
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return version_num


@router.get("/{content_type}/{content_id}")
@requires_auth
async def list_versions(request: Request, content_type: str, content_id: str):
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
        versions.append(doc)
    return {"versions": versions, "total": len(versions)}


@router.get("/{content_type}/{content_id}/{version}")
@requires_auth
async def get_version(request: Request, content_type: str, content_id: str, version: int):
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
    return doc
