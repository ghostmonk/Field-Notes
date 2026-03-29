"""
Photo essay Pydantic models.
"""

import re
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

_POSITION_PATTERN = re.compile(r"^\d{1,3}%\s+\d{1,3}%$")


def _validate_position(value: str | None) -> str | None:
    """Validate cover_image_position is a valid CSS percentage pair."""
    if value is None:
        return None
    if not _POSITION_PATTERN.match(value):
        raise ValueError("cover_image_position must be in format 'X% Y%' (e.g. '50% 50%')")
    return value


def _ensure_utc(value: datetime | None) -> datetime | None:
    """Ensure datetime values are in UTC timezone."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class PhotoItem(BaseModel):
    """Single photo within a photo essay."""

    url: str = Field(..., min_length=1)
    srcset: Optional[str] = None
    caption: Optional[str] = None
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    sort_order: int = Field(..., ge=0)


class PhotoEssayCreate(BaseModel):
    """Input model for creating a photo essay."""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_url: str = Field(..., min_length=1)
    cover_image_srcset: Optional[str] = None
    cover_image_position: Optional[str] = "50% 50%"
    photos: List[PhotoItem] = Field(default_factory=list)
    section_id: Optional[str] = None
    is_published: bool = False
    tags: List[str] = Field(default_factory=list)

    validate_position = field_validator("cover_image_position")(_validate_position)


class PhotoEssayUpdate(BaseModel):
    """All-optional model for updating a photo essay."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    cover_image_url: Optional[str] = Field(None, min_length=1)
    cover_image_srcset: Optional[str] = None
    cover_image_position: Optional[str] = None
    photos: Optional[List[PhotoItem]] = None
    section_id: Optional[str] = None
    is_published: Optional[bool] = None
    tags: Optional[List[str]] = None

    validate_position = field_validator("cover_image_position")(_validate_position)


class PhotoEssayResponse(BaseModel):
    """API response model for a photo essay."""

    id: str
    title: str
    description: Optional[str] = None
    cover_image_url: str
    cover_image_srcset: Optional[str] = None
    cover_image_position: Optional[str] = "50% 50%"
    photos: List[PhotoItem]
    is_published: bool
    tags: List[str] = Field(default_factory=list)
    section_id: Optional[str] = None
    user_id: Optional[str] = None
    createdDate: datetime
    updatedDate: datetime

    ensure_utc = field_validator("createdDate", "updatedDate")(_ensure_utc)

    model_config = ConfigDict(from_attributes=True)


class PhotoEssayCard(BaseModel):
    """Lightweight listing model without the photos array."""

    id: str
    title: str
    description: Optional[str] = None
    cover_image_url: str
    cover_image_srcset: Optional[str] = None
    cover_image_position: Optional[str] = "50% 50%"
    is_published: bool
    photo_count: int = 0
    section_id: Optional[str] = None
    createdDate: datetime
    updatedDate: datetime

    ensure_utc = field_validator("createdDate", "updatedDate")(_ensure_utc)

    model_config = ConfigDict(from_attributes=True)
