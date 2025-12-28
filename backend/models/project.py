"""
Project-related Pydantic models for portfolio projects.
"""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectBase(BaseModel):
    """Base model for project data."""

    title: str = Field(..., min_length=1, max_length=200)
    summary: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=50000)
    technologies: List[str] = Field(default_factory=list)
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    image_url: Optional[str] = None
    is_published: bool = True
    is_featured: bool = False
    sort_order: int = Field(default=0)

    @field_validator("github_url", "live_url", "image_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate URL format."""
        if v is None or v == "":
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ProjectCreate(ProjectBase):
    """Model for creating a new project."""

    pass


class ProjectUpdate(BaseModel):
    """Model for updating a project (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=200)
    summary: str | None = Field(None, min_length=1, max_length=500)
    content: str | None = Field(None, min_length=1, max_length=50000)
    technologies: List[str] | None = None
    github_url: str | None = None
    live_url: str | None = None
    image_url: str | None = None
    is_published: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None

    @field_validator("github_url", "live_url", "image_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        """Validate URL format."""
        if v is None or v == "":
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ProjectResponse(ProjectBase):
    """Model for project API responses."""

    id: str
    slug: str
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


class ProjectCard(BaseModel):
    """Lightweight model for project cards in listings."""

    id: str
    title: str
    slug: str
    summary: str
    technologies: List[str]
    image_url: Optional[str]
    github_url: Optional[str]
    live_url: Optional[str]
    is_featured: bool

    model_config = ConfigDict(from_attributes=True)
