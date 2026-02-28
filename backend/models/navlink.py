"""
NavLink-related Pydantic models for navigation menu links.
"""

from datetime import datetime, timezone
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NavLinkBase(BaseModel):
    """Base model for navigation link data."""

    label: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    sort_order: int = Field(0, ge=0)
    is_published: bool = True

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL: allow internal paths (/...) or external http/https URLs."""
        if v.startswith("/"):
            return v
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL format")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("External URLs must use http or https")
        if not parsed.netloc:
            raise ValueError("Invalid URL format")
        return v


class NavLinkCreate(NavLinkBase):
    """Model for creating a new navigation link."""

    pass


class NavLinkUpdate(BaseModel):
    """Model for updating a navigation link (all fields optional)."""

    label: str | None = Field(None, min_length=1, max_length=100)
    url: str | None = Field(None, min_length=1, max_length=500)
    sort_order: int | None = Field(None, ge=0)
    is_published: bool | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate URL if provided."""
        if v is None:
            return v
        if v.startswith("/"):
            return v
        try:
            parsed = urlparse(v)
        except Exception:
            raise ValueError("Invalid URL format")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("External URLs must use http or https")
        if not parsed.netloc:
            raise ValueError("Invalid URL format")
        return v


class NavLinkResponse(NavLinkBase):
    """Model for navigation link API responses."""

    id: str
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
