"""Resume Pydantic models."""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactInfo(BaseModel):
    full_name: str = Field(default="", max_length=200)
    email: str = Field(default="", max_length=200)
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None


class WorkExperience(BaseModel):
    company: str = Field(default="", max_length=200)
    company_url: Optional[str] = None
    title: str = Field(default="", max_length=200)
    start_date: str = Field(default="")
    end_date: Optional[str] = None
    current: bool = False
    description: str = Field(default="", max_length=5000)
    technologies: List[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str = Field(default="", max_length=200)
    degree: str = Field(default="", max_length=200)
    field_of_study: Optional[str] = None
    start_date: str = Field(default="")
    end_date: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)


class ResumeCreate(BaseModel):
    contact: ContactInfo
    summary: str = Field(default="", max_length=2000)
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


class ResumeUpdate(BaseModel):
    contact: Optional[ContactInfo] = None
    summary: Optional[str] = Field(default=None, max_length=2000)
    work_experience: Optional[List[WorkExperience]] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None
    achievements: Optional[List[str]] = None


class ResumeResponse(ResumeCreate):
    id: str
    user_id: str
    createdDate: datetime
    updatedDate: datetime

    @field_validator("createdDate", "updatedDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
