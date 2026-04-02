from typing import Literal, Optional

from pydantic import BaseModel


class AssetVariant(BaseModel):
    variant: str
    path: str
    size_bytes: int


class AssetContentRef(BaseModel):
    content_type: str
    title: str
    id: str


class AssetGroup(BaseModel):
    asset_id: str
    type: Literal["image", "video"]
    variants: list[AssetVariant]
    total_size_bytes: int
    created_date: Optional[str] = None
    referenced_by: list[AssetContentRef] = []


class AssetListResponse(BaseModel):
    items: list[AssetGroup]
    next_cursor: Optional[str] = None
    total_count: int
