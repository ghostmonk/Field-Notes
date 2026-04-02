"""Comment-related Pydantic models."""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Mention(BaseModel):
    """Model for a user mention within a comment."""

    user_id: str
    user_name: str


class CommentCreate(BaseModel):
    """Model for creating a new comment."""

    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: str | None = Field(None, description="Parent comment ID for replies")
    mentions: list[Mention] = Field(default_factory=list)


class CommentResponse(BaseModel):
    """Model for comment API responses."""

    id: str
    target_type: str
    target_id: str
    parent_id: str | None
    user_id: str
    user_name: str
    user_avatar: str | None
    content: str
    mentions: list[Mention]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    replies: list["CommentResponse"] = Field(default_factory=list)

    @field_validator("created_at", "updated_at")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        """Ensure datetime is in UTC timezone."""
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class CommentsListResponse(BaseModel):
    """Response model for listing comments."""

    comments: list[CommentResponse]


# Enable forward reference for nested replies
CommentResponse.model_rebuild()
CommentsListResponse.model_rebuild()
