"""Engagement handlers for reactions and comments."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from config.engagement import ENGAGEMENT_ENABLED_TYPES
from database import get_comments_collection, get_reactions_collection
from decorators.auth import requires_auth
from glogger import logger
from models.reaction import ReactionCounts, ReactionCreate
from models.user import UserInfo
from motor.motor_asyncio import AsyncIOMotorCollection

router = APIRouter(prefix="/api/engagement")


def validate_target_type(target_type: str, feature: str) -> None:
    """Validate that target_type has the feature enabled."""
    if target_type not in ENGAGEMENT_ENABLED_TYPES:
        raise HTTPException(
            status_code=422,
            detail={"error": "invalid_target_type", "message": f"Unknown target type: {target_type}"},
        )
    if not ENGAGEMENT_ENABLED_TYPES[target_type].get(feature, False):
        raise HTTPException(
            status_code=422,
            detail={"error": "feature_disabled", "message": f"{feature} disabled for {target_type}"},
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

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

    logger.info_with_context(
        "Fetching reactions",
        {"target_type": target_type, "target_id": target_id},
    )

    # Get all reactions for this target
    cursor = reactions_collection.find(
        {"target_type": target_type, "target_id": target_id}
    )
    reactions = await cursor.to_list(length=1000)

    # Build counts and details
    counts: dict[str, int] = {}
    details: dict[str, list[dict[str, str]]] = {}

    for reaction in reactions:
        tag = reaction["reaction_tag"]
        counts[tag] = counts.get(tag, 0) + 1
        if tag not in details:
            details[tag] = []
        details[tag].append({
            "user_id": reaction["user_id"],
            "user_name": reaction["user_name"],
        })

    # Get current user's reactions if authenticated
    user_reactions: list[str] = []
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id
        user_reactions = [r["reaction_tag"] for r in reactions if r["user_id"] == user_id]

    return ReactionCounts(counts=counts, user_reactions=user_reactions, details=details)


@router.post("/{target_type}/{target_id}/reactions")
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

    if not ObjectId.is_valid(target_id):
        raise HTTPException(status_code=400, detail="Invalid target ID format")

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
    existing = await reactions_collection.find_one({
        "target_type": target_type,
        "target_id": target_id,
        "user_id": user.id,
        "reaction_tag": reaction.reaction_tag,
    })

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
