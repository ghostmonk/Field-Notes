"""Reaction-related Pydantic models."""

from datetime import datetime, timezone
from typing import Literal

from config.engagement import ALLOWED_REACTION_TAGS
from pydantic import BaseModel, ConfigDict, Field, field_validator

ReactionTag = Literal["thumbup", "heart", "surprise", "celebrate", "insightful"]


class ReactionCreate(BaseModel):
    """Model for creating/toggling a reaction."""

    reaction_tag: str = Field(..., description="The semantic reaction tag")

    @field_validator("reaction_tag")
    @classmethod
    def validate_reaction_tag(cls, v: str) -> str:
        """Validate that reaction_tag is in the allowed list."""
        if v not in ALLOWED_REACTION_TAGS:
            raise ValueError(f"Invalid reaction tag. Allowed: {ALLOWED_REACTION_TAGS}")
        return v


class ReactionResponse(BaseModel):
    """Model for a single reaction in API responses."""

    id: str
    target_type: str
    target_id: str
    user_id: str
    user_name: str
    reaction_tag: str
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        """Ensure datetime is in UTC timezone."""
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class ReactionCounts(BaseModel):
    """Model for reaction counts by tag."""

    counts: dict[str, int] = Field(default_factory=dict)
    user_reactions: list[str] = Field(default_factory=list)
    details: dict[str, list[dict[str, str]]] = Field(default_factory=dict)


class ToggleReactionResponse(BaseModel):
    """Response model for toggling a reaction."""

    added: bool
    reaction_tag: str


class BulkCountsRequest(BaseModel):
    """Request model for bulk counts endpoint."""

    targets: list[dict[str, str]] = Field(..., description="List of {type, id} objects")


class BulkCountsResponse(BaseModel):
    """Response model for bulk counts endpoint."""

    counts: dict[str, dict[str, int | dict[str, int]]] = Field(default_factory=dict)
