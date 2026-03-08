from typing import Literal

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    title: str
    excerpt: str
    content_type: Literal["story", "project", "page"]
    slug: str
    section_slug: str | None = None
    score: float = 0.0


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    total: int
