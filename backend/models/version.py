from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ContentVersion(BaseModel):
    id: str = Field(alias="_id", default=None)
    content_id: str
    content_type: Literal["story", "project", "page"]
    version: int
    title: str
    content: str
    metadata: dict = {}
    created_by: str
    created_at: datetime

    class Config:
        populate_by_name = True
