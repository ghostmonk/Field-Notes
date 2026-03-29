import asyncio
import re
import traceback
from datetime import datetime, timezone

from bson import ObjectId
from database import get_db, get_tags_collection
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.tag import (
    TagCreate,
    TaggedContentItem,
    TaggedContentResponse,
    TagResponse,
    normalize_tag,
)
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument
from utils import find_many_and_convert, find_one_and_convert, mongo_to_pydantic

router = APIRouter()


@router.get("/tags")
async def get_tags(
    request: Request,
    q: str = Query(None, min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    collection: AsyncIOMotorCollection = Depends(get_tags_collection),
):
    try:
        query = {}
        if q:
            normalized_q = normalize_tag(q)
            query["name"] = {"$regex": f"^{re.escape(normalized_q)}"}

        total = await collection.count_documents(query)

        tags = await find_many_and_convert(
            collection,
            query,
            TagResponse,
            [("name", 1)],
            limit=limit,
            skip=offset,
        )

        return {"items": tags, "total": total, "limit": limit, "offset": offset}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching tags",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching tags",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.get("/tags/{tag_name}/content", response_model=TaggedContentResponse)
async def get_content_by_tag(
    request: Request,
    tag_name: str,
):
    try:
        normalized = normalize_tag(tag_name)
        if not normalized:
            raise HTTPException(status_code=400, detail="Invalid tag name")

        db = await get_db()
        base_query = {
            "tags": normalized,
            "deleted": {"$ne": True},
            "is_published": True,
        }
        projection = {
            "_id": 1,
            "title": 1,
            "slug": 1,
            "tags": 1,
            "section_id": 1,
            "createdDate": 1,
        }

        async def search_collection(coll_name, content_type):
            results = []
            async for doc in (
                db[coll_name].find(base_query, projection).sort("createdDate", -1).limit(50)
            ):
                doc["content_type"] = content_type
                results.append(mongo_to_pydantic(doc, TaggedContentItem))
            return results

        stories, projects, pages, photo_essays = await asyncio.gather(
            search_collection("stories", "story"),
            search_collection("projects", "project"),
            search_collection("pages", "page"),
            search_collection("photo_essays", "photo-essay"),
        )

        items = stories + projects + pages + photo_essays
        items.sort(key=lambda x: x.createdDate, reverse=True)

        return TaggedContentResponse(tag=normalized, items=items, total=len(items))

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error fetching content by tag",
            {
                "tag_name": tag_name,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while fetching content by tag",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.post("/tags", response_model=TagResponse, status_code=201)
@limiter.limit("10/minute")
@requires_auth
async def create_tag(
    request: Request,
    tag: TagCreate,
    collection: AsyncIOMotorCollection = Depends(get_tags_collection),
):
    try:
        current_time = datetime.now(timezone.utc)
        doc = await collection.find_one_and_update(
            {"name": tag.name},
            {"$setOnInsert": {"name": tag.name, "createdDate": current_time}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        created_tag = mongo_to_pydantic(doc, TagResponse)

        logger.info_with_context(
            "Tag created",
            {"tag_id": created_tag.id, "name": created_tag.name},
        )

        return created_tag

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error creating tag",
            {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while creating the tag",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )


@router.delete("/tags/{tag_id}", status_code=204)
@limiter.limit("5/minute")
@requires_auth
async def delete_tag(
    request: Request,
    tag_id: str,
    collection: AsyncIOMotorCollection = Depends(get_tags_collection),
):
    try:
        user: UserInfo = request.state.user
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        if not ObjectId.is_valid(tag_id):
            raise HTTPException(status_code=400, detail="Invalid tag ID format")

        existing = await find_one_and_convert(collection, {"_id": ObjectId(tag_id)}, TagResponse)

        if not existing:
            raise HTTPException(status_code=404, detail="Tag not found")

        # Remove this tag from all content documents
        db = await get_db()
        pull_op = {"$pull": {"tags": existing.name}}
        await asyncio.gather(
            db["stories"].update_many({"tags": existing.name}, pull_op),
            db["projects"].update_many({"tags": existing.name}, pull_op),
            db["pages"].update_many({"tags": existing.name}, pull_op),
            db["photo_essays"].update_many({"tags": existing.name}, pull_op),
        )

        result = await collection.delete_one({"_id": ObjectId(tag_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete tag")

        logger.info_with_context(
            "Tag deleted",
            {"tag_id": tag_id, "name": existing.name},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception_with_context(
            "Error deleting tag",
            {
                "tag_id": tag_id,
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(
            status_code=500,
            detail={
                "message": "An error occurred while deleting the tag",
                "error_type": type(e).__name__,
                "error_details": str(e),
            },
        )
