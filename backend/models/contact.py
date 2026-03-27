"""Contact form Pydantic models."""

import re
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _strip_html(value: str) -> str:
    """Remove HTML tags and strip whitespace.

    Cosmetic only — XSS protection is handled by React auto-escaping
    at the rendering layer.
    """
    return re.sub(r"<[^>]+>", "", value).strip()


class ContactSubmission(BaseModel):
    """Incoming contact form data."""

    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=1, max_length=2000)
    turnstile_token: str = Field(..., min_length=1)
    honeypot: str = ""
    elapsed_ms: int = Field(..., ge=0)

    @field_validator("name", "message", mode="before")
    @classmethod
    def strip_html(cls, value: str) -> str:
        if isinstance(value, str):
            return _strip_html(value)
        return value


class ContactMessageDoc(BaseModel):
    """MongoDB document shape for stored contact messages."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    email: str
    message: str
    ip_hash: str
    user_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False
