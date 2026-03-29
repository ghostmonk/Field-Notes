from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class RedirectCreate(BaseModel):
    old_path: str
    new_path: str
    content_id: Optional[str] = None
    content_type: Optional[str] = None
    expires_at: Optional[datetime] = None

    @field_validator("old_path", "new_path", mode="before")
    @classmethod
    def strip_leading_slash(cls, v: str) -> str:
        return v.lstrip("/")


class RedirectResponse(BaseModel):
    id: str
    old_path: str
    new_path: str
    content_id: Optional[str] = None
    content_type: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
