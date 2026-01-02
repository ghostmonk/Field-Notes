"""Engagement handlers for reactions and comments."""

import html
from datetime import datetime, timezone

from bson import ObjectId
from config.engagement import ENGAGEMENT_ENABLED_TYPES
from database import (
    get_collection,
    get_comments_collection,
    get_projects_collection,
    get_reactions_collection,
)
from decorators.auth import requires_auth
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.comment import CommentCreate
from models.reaction import (
    BulkCountsRequest,
    BulkCountsResponse,
    ReactionCounts,
    ReactionCreate,
)
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection

router = APIRouter(prefix="/api/engagement")


def validate_target_type(target_type: str, feature: str) -> None:
    """Validate that target_type has the feature enabled."""
    if target_type not in ENGAGEMENT_ENABLED_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_target_type",
                "message": f"Unknown target type: {target_type}",
            },
        )
    if not ENGAGEMENT_ENABLED_TYPES[target_type].get(feature, False):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "feature_disabled",
                "message": f"{feature} disabled for {target_type}",
            },
        )


def validate_object_id(value: str, name: str = "ID") -> ObjectId:
    """Validate and convert string to ObjectId."""
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {name} format")
    return ObjectId(value)


async def validate_target_exists(target_type: str, target_id: str) -> None:
    """Validate that the target exists and is published."""
    if target_type == "story":
        collection = await get_collection()
        target = await collection.find_one({"_id": ObjectId(target_id), "is_published": True})
    elif target_type == "project":
        collection = await get_projects_collection()
        target = await collection.find_one({"_id": ObjectId(target_id), "is_published": True})
    else:
        return  # Unknown types already rejected by validate_target_type

    if not target:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "target_not_found",
                "message": f"{target_type} not found or not published",
            },
        )


@router.get("/{target_type}/{target_id}/reactions")
async def get_reactions(
    request: Request,
    target_type: str,
    target_id: str,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
) -> ReactionCounts:
    """Get reactions for a target. Public endpoint."""
    validate_target_type(target_type, "reactions")
    validate_object_id(target_id, "target ID")

    logger.info_with_context(
        "Fetching reactions",
        {"target_type": target_type, "target_id": target_id},
    )

    # Get all reactions for this target
    cursor = reactions_collection.find({"target_type": target_type, "target_id": target_id})
    reactions = await cursor.to_list(length=1000)

    # Build counts and details
    counts: dict[str, int] = {}
    details: dict[str, list[dict[str, str]]] = {}

    for reaction in reactions:
        tag = reaction["reaction_tag"]
        counts[tag] = counts.get(tag, 0) + 1
        if tag not in details:
            details[tag] = []
        details[tag].append(
            {
                "user_id": reaction["user_id"],
                "user_name": reaction["user_name"],
            }
        )

    # Get current user's reactions if authenticated
    user_reactions: list[str] = []
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id
        user_reactions = [r["reaction_tag"] for r in reactions if r["user_id"] == user_id]

    return ReactionCounts(counts=counts, user_reactions=user_reactions, details=details)


@router.post("/{target_type}/{target_id}/reactions")
@limiter.limit("10/minute")
@requires_auth
async def toggle_reaction(
    request: Request,
    target_type: str,
    target_id: str,
    reaction: ReactionCreate,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
) -> dict:
    """Toggle a reaction (add if missing, remove if exists). Requires auth."""
    validate_target_type(target_type, "reactions")
    validate_object_id(target_id, "target ID")
    await validate_target_exists(target_type, target_id)

    user: UserInfo = request.state.user

    logger.info_with_context(
        "Toggling reaction",
        {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "reaction_tag": reaction.reaction_tag,
        },
    )

    # Check if reaction already exists
    existing = await reactions_collection.find_one(
        {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "reaction_tag": reaction.reaction_tag,
        }
    )

    if existing:
        # Remove the reaction
        await reactions_collection.delete_one({"_id": existing["_id"]})
        logger.info_with_context("Reaction removed", {"reaction_id": str(existing["_id"])})
        return {"added": False, "reaction_tag": reaction.reaction_tag}
    else:
        # Add the reaction
        doc = {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "user_name": user.name,
            "reaction_tag": reaction.reaction_tag,
            "created_at": datetime.now(timezone.utc),
        }
        result = await reactions_collection.insert_one(doc)
        logger.info_with_context("Reaction added", {"reaction_id": str(result.inserted_id)})
        return {"added": True, "reaction_tag": reaction.reaction_tag}


@router.get("/{target_type}/{target_id}/comments")
async def get_comments(
    request: Request,
    target_type: str,
    target_id: str,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> dict:
    """Get comments for a target with nested replies. Public endpoint."""
    validate_target_type(target_type, "comments")
    validate_object_id(target_id, "target ID")

    logger.info_with_context(
        "Fetching comments",
        {"target_type": target_type, "target_id": target_id},
    )

    # Get all non-deleted comments for this target
    cursor = comments_collection.find(
        {
            "target_type": target_type,
            "target_id": target_id,
            "deleted_at": None,
        }
    ).sort("created_at", 1)

    all_comments = await cursor.to_list(length=1000)

    # Build nested structure
    comments_by_id: dict[str, dict] = {}
    top_level: list[dict] = []

    for comment in all_comments:
        comment_dict = {
            "id": str(comment["_id"]),
            "target_type": comment["target_type"],
            "target_id": comment["target_id"],
            "parent_id": comment.get("parent_id"),
            "user_id": comment["user_id"],
            "user_name": comment["user_name"],
            "user_avatar": comment.get("user_avatar"),
            "content": comment["content"],
            "mentions": comment.get("mentions", []),
            "created_at": comment["created_at"].isoformat(),
            "updated_at": comment["updated_at"].isoformat(),
            "deleted_at": None,
            "replies": [],
        }
        comments_by_id[str(comment["_id"])] = comment_dict

        if comment.get("parent_id") is None:
            top_level.append(comment_dict)

    # Attach replies to parents
    for comment in all_comments:
        parent_id = comment.get("parent_id")
        if parent_id and parent_id in comments_by_id:
            comments_by_id[parent_id]["replies"].append(comments_by_id[str(comment["_id"])])

    return {"comments": top_level}


@router.post("/{target_type}/{target_id}/comments", status_code=201)
@limiter.limit("3/minute")
@requires_auth
async def create_comment(
    request: Request,
    target_type: str,
    target_id: str,
    comment: CommentCreate,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> dict:
    """Create a new comment. Requires auth."""
    validate_target_type(target_type, "comments")
    validate_object_id(target_id, "target ID")
    await validate_target_exists(target_type, target_id)

    # Validate parent_id if provided (must be a top-level comment)
    if comment.parent_id:
        parent_oid = validate_object_id(comment.parent_id, "parent ID")
        parent = await comments_collection.find_one(
            {
                "_id": parent_oid,
                "target_type": target_type,
                "target_id": target_id,
                "parent_id": None,  # Must be top-level
                "deleted_at": None,
            }
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    user: UserInfo = request.state.user
    now = datetime.now(timezone.utc)

    logger.info_with_context(
        "Creating comment",
        {
            "target_type": target_type,
            "target_id": target_id,
            "user_id": user.id,
            "has_parent": comment.parent_id is not None,
        },
    )

    # Sanitize user input to prevent XSS
    sanitized_content = html.escape(comment.content)
    sanitized_mentions = [
        {"user_id": m.user_id, "user_name": html.escape(m.user_name)} for m in comment.mentions
    ]

    doc = {
        "target_type": target_type,
        "target_id": target_id,
        "parent_id": comment.parent_id,
        "user_id": user.id,
        "user_name": user.name,
        "user_avatar": getattr(user, "avatar_url", None),
        "content": sanitized_content,
        "mentions": sanitized_mentions,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }

    result = await comments_collection.insert_one(doc)
    created = await comments_collection.find_one({"_id": result.inserted_id})

    logger.info_with_context("Comment created", {"comment_id": str(result.inserted_id)})

    return {
        "id": str(created["_id"]),
        "target_type": created["target_type"],
        "target_id": created["target_id"],
        "parent_id": created.get("parent_id"),
        "user_id": created["user_id"],
        "user_name": created["user_name"],
        "user_avatar": created.get("user_avatar"),
        "content": created["content"],
        "mentions": created.get("mentions", []),
        "created_at": created["created_at"].isoformat(),
        "updated_at": created["updated_at"].isoformat(),
        "deleted_at": None,
        "replies": [],
    }


@router.delete("/comments/{comment_id}", status_code=204)
@limiter.limit("10/minute")
@requires_auth
async def delete_comment(
    request: Request,
    comment_id: str,
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
):
    """Soft delete a comment. Users can only delete their own comments."""
    comment_oid = validate_object_id(comment_id, "comment ID")
    user: UserInfo = request.state.user

    comment = await comments_collection.find_one(
        {
            "_id": comment_oid,
            "deleted_at": None,
        }
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Users can only delete their own comments (for now)
    if comment["user_id"] != user.id:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "You can only delete your own comments"},
        )

    logger.info_with_context(
        "Soft deleting comment",
        {"comment_id": comment_id, "user_id": user.id},
    )

    await comments_collection.update_one(
        {"_id": comment_oid},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
    )

    logger.info_with_context("Comment soft deleted", {"comment_id": comment_id})


@router.post("/bulk/counts")
async def get_bulk_counts(
    request: Request,
    body: BulkCountsRequest,
    reactions_collection: AsyncIOMotorCollection = Depends(get_reactions_collection),
    comments_collection: AsyncIOMotorCollection = Depends(get_comments_collection),
) -> BulkCountsResponse:
    """Get reaction counts and comment counts for multiple targets. Public endpoint."""
    # Filter and validate targets, group by enabled features
    reaction_targets: list[dict[str, str]] = []
    comment_targets: list[dict[str, str]] = []
    all_keys: set[str] = set()

    for target in body.targets:
        target_type = target.get("type", "")
        target_id = target.get("id", "")

        if not target_type or not target_id:
            continue

        key = f"{target_type}:{target_id}"
        all_keys.add(key)

        config = ENGAGEMENT_ENABLED_TYPES.get(target_type, {})
        if config.get("reactions", False):
            reaction_targets.append({"target_type": target_type, "target_id": target_id})
        if config.get("comments", False):
            comment_targets.append({"target_type": target_type, "target_id": target_id})

    # Initialize result with empty counts for all requested targets
    result: dict[str, dict] = {key: {"reactions": {}, "comment_count": 0} for key in all_keys}

    # Single aggregation for all reaction counts
    if reaction_targets:
        pipeline = [
            {"$match": {"$or": reaction_targets}},
            {
                "$group": {
                    "_id": {
                        "target_type": "$target_type",
                        "target_id": "$target_id",
                        "tag": "$reaction_tag",
                    },
                    "count": {"$sum": 1},
                }
            },
        ]
        async for doc in reactions_collection.aggregate(pipeline):
            key = f"{doc['_id']['target_type']}:{doc['_id']['target_id']}"
            tag = doc["_id"]["tag"]
            result[key]["reactions"][tag] = doc["count"]

    # Single aggregation for all comment counts
    if comment_targets:
        pipeline = [
            {"$match": {"$or": comment_targets, "deleted_at": None}},
            {
                "$group": {
                    "_id": {"target_type": "$target_type", "target_id": "$target_id"},
                    "count": {"$sum": 1},
                }
            },
        ]
        async for doc in comments_collection.aggregate(pipeline):
            key = f"{doc['_id']['target_type']}:{doc['_id']['target_id']}"
            result[key]["comment_count"] = doc["count"]

    return BulkCountsResponse(counts=result)
