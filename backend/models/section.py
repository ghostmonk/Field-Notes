"""
Section-related Pydantic models for dynamic site sections.
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_ICONS = {
    "home",
    "user",
    "folder",
    "mail",
    "star",
    "heart",
    "tag",
    "globe",
    "chat",
    "bell",
    "fire",
    "thumb-up",
    "eye",
    "clock",
    "shield-check",
    "camera",
    "photograph",
    "film",
    "music-note",
    "book-open",
    "document-text",
    "pencil",
    "code",
    "lightning-bolt",
    "chip",
    "beaker",
    "terminal",
    "cube",
    "color-swatch",
    "sparkles",
    "puzzle",
    "academic-cap",
    "light-bulb",
    "map",
    "calendar",
    "collection",
    "clipboard-list",
    "default",
}

DisplayType = Literal["feed", "card-grid", "static-page", "gallery"]
ContentType = Literal["story", "project", "page", "photo_essay"]
NavVisibility = Literal["main", "secondary", "hidden"]


class SectionBase(BaseModel):
    """Base model for section data."""

    title: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    parent_id: str | None = Field(None)
    display_type: DisplayType
    nav_visibility: NavVisibility = "main"
    sort_order: int = Field(0, ge=0)
    is_published: bool = True
    icon: str = Field("default", description="Icon key from HeroIcons v1 set")

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str) -> str:
        if v not in VALID_ICONS:
            raise ValueError(f"Invalid icon '{v}'. Must be one of: {sorted(VALID_ICONS)}")
        return v


class SectionCreate(BaseModel):
    """Model for creating a new section."""

    title: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    parent_id: str | None = Field(None)
    display_type: DisplayType
    nav_visibility: NavVisibility = "main"
    sort_order: int = Field(0, ge=0)
    is_published: bool = True
    icon: str = Field("default", description="Icon key from HeroIcons v1 set")

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str) -> str:
        if v not in VALID_ICONS:
            raise ValueError(f"Invalid icon '{v}'. Must be one of: {sorted(VALID_ICONS)}")
        return v


class SectionUpdate(BaseModel):
    """Model for updating a section (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=200)
    # parent_id excluded — use PUT /sections/{id}/move for reparenting (has cycle detection)
    display_type: DisplayType | None = None
    nav_visibility: NavVisibility | None = None
    sort_order: int | None = Field(None, ge=0)
    is_published: bool | None = None
    icon: str | None = None

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_ICONS:
            raise ValueError(f"Invalid icon '{v}'. Must be one of: {sorted(VALID_ICONS)}")
        return v


class SectionResponse(SectionBase):
    """Model for section API responses."""

    id: str
    slug: str
    path: str
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
