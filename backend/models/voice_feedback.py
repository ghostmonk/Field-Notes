"""Voice feedback models for resume tailoring quality loop."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class VoiceFeedbackCreate(BaseModel):
    original_text: str = Field(..., min_length=1)
    final_text: Optional[str] = None
    feedback_type: str = Field(..., pattern="^(approved|rejected|edited|flagged)$")
    job_context: str = Field(..., min_length=1)
    note: Optional[str] = None
    section_type: Optional[str] = None

    @model_validator(mode="after")
    def validate_edited_has_final_text(self):
        if self.feedback_type == "edited" and not self.final_text:
            raise ValueError("final_text is required when feedback_type is 'edited'")
        return self


class VoiceFeedbackResponse(VoiceFeedbackCreate):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str
    qdrant_id: Optional[str] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_datetime(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v)
        return v
