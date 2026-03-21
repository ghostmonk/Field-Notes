"""Content chunk models for vector search pipeline."""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChunkMetadata(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)


class ContentChunkCreate(BaseModel):
    chunk_type: str = Field(
        ...,
        pattern="^(role_summary|achievement|skill_context|education|project|meta)$",
    )
    source: str = Field(default="resume", pattern="^(resume|blog|conversation|opinion)$")
    text: str = Field(..., min_length=1, max_length=10000)
    metadata: ChunkMetadata = Field(default_factory=ChunkMetadata)


class ContentChunkResponse(ContentChunkCreate):
    id: str
    qdrant_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
