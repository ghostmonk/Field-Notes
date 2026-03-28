import re
from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_tag(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"\s+", "-", name)
    name = re.sub(r"[^a-z0-9-]", "", name)
    name = re.sub(r"-+", "-", name)
    return name.strip("-")


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        normalized = normalize_tag(v)
        if not normalized:
            raise ValueError("Tag name must contain at least one alphanumeric character")
        return normalized


class TagResponse(BaseModel):
    id: str
    name: str
    createdDate: datetime

    @field_validator("createdDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class TaggedContentItem(BaseModel):
    id: str
    title: str
    slug: str = ""
    content_type: str
    section_id: str | None = None
    tags: List[str] = Field(default_factory=list)
    createdDate: datetime

    @field_validator("createdDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)


class TaggedContentResponse(BaseModel):
    tag: str
    items: List[TaggedContentItem]
    total: int
