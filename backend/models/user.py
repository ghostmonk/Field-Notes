"""
User-related Pydantic models for multi-tenancy support.
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

UserRole = Literal["admin", "commenter"]


class AuthProviderInfo(BaseModel):
    """Information about an authentication provider."""

    provider: str  # "google", future: "github", etc.
    provider_user_id: str
    email: EmailStr


class UserBase(BaseModel):
    """Base model for user data."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=200)
    avatar_url: str | None = None
    role: UserRole = "commenter"


class UserCreate(UserBase):
    """Model for creating a new user (internal use)."""

    auth_providers: list[AuthProviderInfo] = Field(default_factory=list)


class UserResponse(UserBase):
    """Model for user API responses."""

    id: str
    auth_providers: list[AuthProviderInfo] = Field(default_factory=list)
    createdDate: datetime
    updatedDate: datetime

    @field_validator("createdDate", "updatedDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        """Ensure datetime values are in UTC timezone."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class UserInfo(BaseModel):
    """Lightweight user context for request state."""

    id: str
    email: EmailStr
    role: UserRole
