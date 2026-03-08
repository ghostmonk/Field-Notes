import re

from bson import ObjectId
from database import get_db
from fastapi import APIRouter, Query
from models.search import SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["search"])


def strip_html(html: str) -> str:
    """Remove HTML tags for excerpt generation."""
    return re.sub(r"<[^>]+>", "", html)


def make_excerpt(content: str, max_length: int = 200) -> str:
    """Generate a plain-text excerpt from HTML content."""
    text = strip_html(content)
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(" ", 1)[0] + "..."


async def _resolve_section_slug(db, section_id: str) -> str | None:
    """Look up section slug from section_id."""
    if not section_id:
        return None
    section = await db.sections.find_one({"_id": section_id})
    if not section and ObjectId.is_valid(section_id):
        section = await db.sections.find_one({"_id": ObjectId(section_id)})
    return section.get("slug") if section else None


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
):
    db = await get_db()
    results = []

    # Search stories (published only)
    async for doc in (
        db.stories.find(
            {"$text": {"$search": q}, "is_published": True, "deleted": {"$ne": True}},
            {"score": {"$meta": "textScore"}},
        )
        .sort([("score", {"$meta": "textScore"})])
        .limit(limit)
    ):
        section_slug = await _resolve_section_slug(db, doc.get("section_id", ""))
        results.append(
            SearchResult(
                id=str(doc["_id"]),
                title=doc["title"],
                excerpt=make_excerpt(doc.get("content", "")),
                content_type="story",
                slug=doc.get("slug", ""),
                section_slug=section_slug,
                score=doc.get("score", 0),
            )
        )

    # Search projects (published only)
    async for doc in (
        db.projects.find(
            {"$text": {"$search": q}, "is_published": True, "deleted": {"$ne": True}},
            {"score": {"$meta": "textScore"}},
        )
        .sort([("score", {"$meta": "textScore"})])
        .limit(limit)
    ):
        section_slug = await _resolve_section_slug(db, doc.get("section_id", ""))
        results.append(
            SearchResult(
                id=str(doc["_id"]),
                title=doc["title"],
                excerpt=make_excerpt(doc.get("summary", doc.get("content", ""))),
                content_type="project",
                slug=doc.get("slug", ""),
                section_slug=section_slug,
                score=doc.get("score", 0),
            )
        )

    # Search pages (published only)
    async for doc in (
        db.pages.find(
            {"$text": {"$search": q}, "is_published": True, "deleted": {"$ne": True}},
            {"score": {"$meta": "textScore"}},
        )
        .sort([("score", {"$meta": "textScore"})])
        .limit(limit)
    ):
        results.append(
            SearchResult(
                id=str(doc["_id"]),
                title=doc["title"],
                excerpt=make_excerpt(doc.get("content", "")),
                content_type="page",
                slug=doc.get("page_type", ""),
                section_slug=doc.get("page_type"),
                score=doc.get("score", 0),
            )
        )

    # Sort all results by score descending
    results.sort(key=lambda r: r.score, reverse=True)
    results = results[:limit]

    return SearchResponse(results=results, query=q, total=len(results))
