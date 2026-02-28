"""
Section-related Pydantic models for dynamic site sections.
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DisplayType = Literal["feed", "card-grid", "static-page", "gallery"]
ContentType = Literal["story", "project", "page", "image"]
NavVisibility = Literal["main", "secondary", "hidden"]


class SectionBase(BaseModel):
    """Base model for section data."""

    title: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    parent_id: str | None = Field(None)
    display_type: DisplayType
    content_type: ContentType
    nav_visibility: NavVisibility = "main"
    sort_order: int = Field(0, ge=0)
    is_published: bool = True


class SectionCreate(BaseModel):
    """Model for creating a new section."""

    title: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    parent_id: str | None = Field(None)
    display_type: DisplayType
    content_type: ContentType
    nav_visibility: NavVisibility = "main"
    sort_order: int = Field(0, ge=0)
    is_published: bool = True


class SectionUpdate(BaseModel):
    """Model for updating a section (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    parent_id: str | None = Field(None)
    display_type: DisplayType | None = None
    content_type: ContentType | None = None
    nav_visibility: NavVisibility | None = None
    sort_order: int | None = Field(None, ge=0)
    is_published: bool | None = None


class SectionResponse(SectionBase):
    """Model for section API responses."""

    id: str
    slug: str
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
