"""Job application models for the lightweight ATS."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class JobApplicationCreate(BaseModel):
    company: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    job_url: Optional[str] = Field(None, pattern=r"^https?://")

    @field_validator("job_url", mode="before")
    @classmethod
    def validate_url_scheme(cls, v):
        if v is not None and not v.startswith(("http://", "https://")):
            raise ValueError("job_url must start with http:// or https://")
        return v

    job_description: str = Field(..., min_length=1)
    tailored_resume: Dict[str, Any] = Field(...)
    evaluation_score: Dict[str, Any] = Field(...)
    usage: Optional[Dict[str, Any]] = None
    status: str = Field(default="saved", pattern="^(saved|applied|interviewing|offered|rejected)$")
    notes: Optional[str] = None


class JobApplicationUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(saved|applied|interviewing|offered|rejected)$")
    notes: Optional[str] = None
    job_url: Optional[str] = Field(None, pattern=r"^https?://")


class JobApplicationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str
    company: str
    job_title: str
    job_url: Optional[str] = None
    job_description: str
    tailored_resume: Dict[str, Any]
    evaluation_score: Dict[str, Any]
    usage: Optional[Dict[str, Any]] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def ensure_datetime(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v)
        return v
