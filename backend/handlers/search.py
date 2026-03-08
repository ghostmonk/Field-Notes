import asyncio
import re

from bson import ObjectId
from database import get_db
from fastapi import APIRouter, Query, Request
from middleware.rate_limit import limiter
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


async def _batch_resolve_section_slugs(db, section_ids: set) -> dict:
    """Batch-resolve section slugs from a set of section_ids.

    Returns a dict mapping section_id (str) -> slug (str).
    """
    if not section_ids:
        return {}

    # Try string IDs first
    slug_map: dict[str, str] = {}
    str_ids = [sid for sid in section_ids if sid]

    if str_ids:
        async for section in db.sections.find({"_id": {"$in": str_ids}}):
            slug_map[str(section["_id"])] = section.get("slug", "")

    # For any remaining IDs that are valid ObjectIds, try those
    missing = [sid for sid in str_ids if sid not in slug_map and ObjectId.is_valid(sid)]
    if missing:
        oid_list = [ObjectId(sid) for sid in missing]
        async for section in db.sections.find({"_id": {"$in": oid_list}}):
            slug_map[str(section["_id"])] = section.get("slug", "")

    return slug_map


@router.get("", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
):
    db = await get_db()

    text_filter = {"$text": {"$search": q}, "is_published": True, "deleted": {"$ne": True}}
    text_proj = {"score": {"$meta": "textScore"}}
    text_sort = [("score", {"$meta": "textScore"})]

    async def _search_stories():
        results = []
        async for doc in db.stories.find(text_filter, text_proj).sort(text_sort).limit(limit):
            results.append(
                {
                    "id": str(doc["_id"]),
                    "title": doc["title"],
                    "excerpt": make_excerpt(doc.get("content", "")),
                    "content_type": "story",
                    "slug": doc.get("slug", ""),
                    "section_id": doc.get("section_id", ""),
                    "score": doc.get("score", 0),
                }
            )
        return results

    async def _search_projects():
        results = []
        async for doc in db.projects.find(text_filter, text_proj).sort(text_sort).limit(limit):
            results.append(
                {
                    "id": str(doc["_id"]),
                    "title": doc["title"],
                    "excerpt": make_excerpt(doc.get("summary", doc.get("content", ""))),
                    "content_type": "project",
                    "slug": doc.get("slug", ""),
                    "section_id": doc.get("section_id", ""),
                    "score": doc.get("score", 0),
                }
            )
        return results

    async def _search_pages():
        results = []
        async for doc in db.pages.find(text_filter, text_proj).sort(text_sort).limit(limit):
            results.append(
                {
                    "id": str(doc["_id"]),
                    "title": doc["title"],
                    "excerpt": make_excerpt(doc.get("content", "")),
                    "content_type": "page",
                    "slug": doc.get("page_type", ""),
                    "section_id": None,
                    "section_slug_override": doc.get("page_type"),
                    "score": doc.get("score", 0),
                }
            )
        return results

    story_results, project_results, page_results = await asyncio.gather(
        _search_stories(), _search_projects(), _search_pages()
    )
    raw_results = story_results + project_results + page_results

    # Batch-resolve all section slugs in a single query
    section_ids = {r["section_id"] for r in raw_results if r.get("section_id")}
    slug_map = await _batch_resolve_section_slugs(db, section_ids)

    # Build SearchResult objects
    results = []
    for r in raw_results:
        section_slug = r.get("section_slug_override") or slug_map.get(r.get("section_id", ""))
        results.append(
            SearchResult(
                id=r["id"],
                title=r["title"],
                excerpt=r["excerpt"],
                content_type=r["content_type"],
                slug=r["slug"],
                section_slug=section_slug,
                score=r["score"],
            )
        )

    # Sort all results by score descending
    results.sort(key=lambda r: r.score, reverse=True)
    results = results[:limit]

    return SearchResponse(results=results, query=q, total=len(results))
