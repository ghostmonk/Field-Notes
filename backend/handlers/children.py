from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from database import get_db
from decorators.auth import verify_auth
from fastapi import APIRouter, HTTPException, Query, Request
from models.listing import ListingItem

router = APIRouter()

CONTENT_COLLECTIONS = [
    ("stories", "story"),
    ("projects", "project"),
    ("photo_essays", "photo_essay"),
    ("pages", "page"),
]


async def collect_descendant_ids(db, section_id: str, visited: set | None = None) -> list[str]:
    """Recursively collect all descendant section IDs."""
    if visited is None:
        visited = set()
    if section_id in visited:
        return []
    visited.add(section_id)
    ids = []
    children = (
        await db["sections"]
        .find({"parent_id": section_id, "deleted": {"$ne": True}}, {"_id": 1})
        .to_list(None)
    )
    for child in children:
        child_id = str(child["_id"])
        ids.append(child_id)
        ids.extend(await collect_descendant_ids(db, child_id, visited))
    return ids


def _section_to_listing_item(section: dict) -> ListingItem:
    """Convert a section document to a ListingItem."""
    return ListingItem(
        id=str(section["_id"]),
        slug=section.get("slug", ""),
        item_type="section",
        content_type=section.get("content_type"),
        title=section.get("title", ""),
        path=section.get("path"),
        display_type=section.get("display_type"),
        is_published=section.get("is_published", True),
        is_featured=section.get("is_featured", False),
        sort_order=section.get("sort_order"),
        created_at=section.get("createdDate"),
        updated_at=section.get("updatedDate"),
    )


def _content_to_listing_item(doc: dict, content_type: str) -> ListingItem:
    """Convert a content document to a ListingItem."""
    tags = doc.get("tags", [])
    if not tags and content_type == "project":
        tags = doc.get("technologies", [])

    image_url = doc.get("image_url") or doc.get("cover_image_url")

    return ListingItem(
        id=str(doc["_id"]),
        slug=doc.get("slug", ""),
        item_type="content",
        content_type=content_type,
        title=doc.get("title", ""),
        summary=doc.get("summary"),
        image_url=image_url,
        video_url=doc.get("video_url"),
        tags=tags,
        is_published=doc.get("is_published", True),
        is_featured=doc.get("is_featured", False),
        sort_order=doc.get("sort_order"),
        created_at=doc.get("createdDate"),
        updated_at=doc.get("updatedDate"),
        user_id=str(doc["user_id"]) if doc.get("user_id") else None,
    )


@router.get("/sections/{section_id}/children")
async def get_children(
    request: Request,
    section_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    featured_only: bool = Query(default=False),
    subtree: bool = Query(default=False),
    include_unpublished: bool = Query(default=False),
):
    """Return child sections and content items for a section."""
    db = await get_db()

    # Auth check must come before section lookup to avoid leaking existence of unpublished sections
    if include_unpublished:
        await verify_auth(request)

    # Validate section_id
    try:
        obj_id = ObjectId(section_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=404, detail="Section not found")

    # Verify section exists and is accessible
    section_query = {"_id": obj_id, "deleted": {"$ne": True}}
    if not include_unpublished:
        section_query["is_published"] = True
    section = await db["sections"].find_one(section_query)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Determine which section IDs to query content from
    target_section_ids = [section_id]
    if subtree:
        descendant_ids = await collect_descendant_ids(db, section_id)
        target_section_ids.extend(descendant_ids)

    # Build section query
    section_query = {"parent_id": section_id, "deleted": {"$ne": True}}
    if not include_unpublished:
        section_query["is_published"] = True
    if featured_only:
        section_query["is_featured"] = True

    # Fetch child sections
    child_sections = await db["sections"].find(section_query).sort("sort_order", 1).to_list(None)

    # Build content query
    content_query_base = {"deleted": {"$ne": True}}
    if len(target_section_ids) == 1:
        content_query_base["section_id"] = target_section_ids[0]
    else:
        content_query_base["section_id"] = {"$in": target_section_ids}
    if not include_unpublished:
        content_query_base["is_published"] = True
    if featured_only:
        content_query_base["is_featured"] = True

    # Fetch content from all collections, merge globally by date, then paginate.
    # Correct cross-collection sort requires fetching all items first.
    content_items = []
    for collection_name, content_type in CONTENT_COLLECTIONS:
        docs = (
            await db[collection_name].find(content_query_base).sort("createdDate", -1).to_list(None)
        )
        for doc in docs:
            content_items.append(_content_to_listing_item(doc, content_type))

    # Sort all content globally by created_at descending
    content_items.sort(
        key=lambda x: x.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    # Convert sections to listing items (sections always come first)
    section_items = [_section_to_listing_item(s) for s in child_sections]

    # Merge: sections first, then content
    all_items = section_items + content_items
    total = len(all_items)

    # Apply pagination
    paginated = all_items[offset : offset + limit]

    return {
        "items": [item.model_dump() for item in paginated],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
