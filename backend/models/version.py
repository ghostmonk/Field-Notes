from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ContentVersion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(alias="_id", default=None)
    content_id: str
    content_type: Literal["story", "project", "page"]
    version: int
    title: str
    content: str
    metadata: dict = Field(default_factory=dict)
    created_by: str
    created_at: datetime
