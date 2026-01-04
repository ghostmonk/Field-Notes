"""
NavLink-related Pydantic models for navigation menu links.
"""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NavLinkBase(BaseModel):
    """Base model for navigation link data."""

    label: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    sort_order: int = Field(0, ge=0)
    is_published: bool = True


class NavLinkCreate(NavLinkBase):
    """Model for creating a new navigation link."""

    pass


class NavLinkUpdate(BaseModel):
    """Model for updating a navigation link (all fields optional)."""

    label: str | None = Field(None, min_length=1, max_length=100)
    url: str | None = Field(None, min_length=1, max_length=500)
    sort_order: int | None = Field(None, ge=0)
    is_published: bool | None = None


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
