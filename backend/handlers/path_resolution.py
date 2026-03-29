from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from database import get_db
from decorators.auth import verify_auth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse as FastAPIRedirectResponse

router = APIRouter()

CONTENT_COLLECTIONS = [
    ("stories", "story"),
    ("projects", "project"),
    ("photo_essays", "photo_essay"),
    ("pages", "page"),
]


async def find_content_in_section(
    db, section_id: str, slug: str, include_unpublished: bool = False
) -> dict | None:
    """Search all content collections for an item with this slug in this section."""
    for collection_name, content_type in CONTENT_COLLECTIONS:
        query = {
            "section_id": section_id,
            "slug": slug,
            "deleted": {"$ne": True},
        }
        if not include_unpublished:
            query["is_published"] = True
        item = await db[collection_name].find_one(query)
        if item:
            result = dict(item)
            result["id"] = str(result.pop("_id"))
            result["content_type"] = content_type
            return result
    return None


async def build_breadcrumbs(db, section: dict) -> list:
    """Walk ancestors to build breadcrumb chain."""
    crumbs = []
    current = section
    while current:
        crumbs.append({"title": current["title"], "path": current["path"]})
        if current.get("parent_id"):
            try:
                current = await db["sections"].find_one(
                    {
                        "_id": ObjectId(current["parent_id"]),
                        "deleted": {"$ne": True},
                    }
                )
            except InvalidId:
                current = None
        else:
            current = None
    crumbs.reverse()
    return crumbs


def _section_to_dict(section: dict) -> dict:
    """Convert MongoDB section document to API response dict."""
    result = dict(section)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    # Convert ObjectId fields to strings
    for key in ["parent_id", "user_id"]:
        if isinstance(result.get(key), ObjectId):
            result[key] = str(result[key])
    return result


@router.get("/sections/resolve-path/{full_path:path}")
async def resolve_path(request: Request, full_path: str):
    """Resolve a URL path to a section or content item."""
    db = await get_db()
    path = full_path.strip("/")

    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    # Check authentication for draft preview
    is_authenticated = False
    try:
        await verify_auth(request)
        is_authenticated = True
    except Exception:
        pass

    publish_filter = {} if is_authenticated else {"is_published": True}

    # Try full path as a section
    section = await db["sections"].find_one(
        {
            "path": path,
            **publish_filter,
            "deleted": {"$ne": True},
        }
    )

    if section:
        section_dict = _section_to_dict(section)
        breadcrumbs = await build_breadcrumbs(db, section)
        return {
            "type": "section",
            "section": section_dict,
            "breadcrumbs": breadcrumbs,
        }

    # Split: try parent path as section, last segment as content
    segments = path.split("/")
    if len(segments) > 1:
        parent_path = "/".join(segments[:-1])
        item_slug = segments[-1]

        section = await db["sections"].find_one(
            {
                "path": parent_path,
                **publish_filter,
                "deleted": {"$ne": True},
            }
        )

        if section:
            content = await find_content_in_section(
                db, str(section["_id"]), item_slug, include_unpublished=is_authenticated
            )
            if content:
                section_dict = _section_to_dict(section)
                breadcrumbs = await build_breadcrumbs(db, section)
                breadcrumbs.append({"title": content.get("title", item_slug), "path": path})
                return {
                    "type": "content",
                    "section": section_dict,
                    "content_item": content,
                    "breadcrumbs": breadcrumbs,
                }

    # Check redirects
    redirect = await db["redirects"].find_one({"old_path": path})
    if redirect:
        if redirect.get("expires_at") and redirect["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Path not found")
        return FastAPIRedirectResponse(url=f"/{redirect['new_path']}", status_code=301)

    raise HTTPException(status_code=404, detail="Path not found")
