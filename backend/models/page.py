"""
Page-related Pydantic models for static pages (About, Contact).
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PageType = Literal["about", "contact"]


class PageBase(BaseModel):
    """Base model for page data."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=50000)
    page_type: PageType
    is_published: bool = True


class PageCreate(PageBase):
    """Model for creating a new page."""

    pass


class PageUpdate(BaseModel):
    """Model for updating a page (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=200)
    content: str | None = Field(None, min_length=1, max_length=50000)
    is_published: bool | None = None


class PageResponse(PageBase):
    """Model for page API responses."""

    id: str
    createdDate: datetime
    updatedDate: datetime
    user_id: str | None = None

    @field_validator("createdDate", "updatedDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        """Ensure datetime values are in UTC timezone."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
