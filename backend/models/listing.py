from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ListingItem(BaseModel):
    id: str
    slug: str
    item_type: str  # "section" or "content"
    content_type: Optional[str] = None
    title: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    path: Optional[str] = None
    display_type: Optional[str] = None
    tags: list[str] = []
    is_published: bool = True
    is_featured: bool = False
    sort_order: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_id: Optional[str] = None
