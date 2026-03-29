"""
API handlers for content and section move operations.
"""

from datetime import datetime, timezone

from bson import ObjectId
from database import get_db
from decorators.auth import verify_auth
from fastapi import APIRouter, HTTPException, Request
from glogger import logger
from handlers.sections import cascade_path_updates
from pymongo.errors import DuplicateKeyError
from services.redirects import write_redirect

router = APIRouter()

CONTENT_TYPE_TO_COLLECTION = {
    "story": "stories",
    "project": "projects",
    "photo_essay": "photo_essays",
    "page": "pages",
}

CONTENT_COLLECTIONS = [
    ("stories", "story"),
    ("projects", "project"),
    ("photo_essays", "photo_essay"),
    ("pages", "page"),
]


async def would_create_cycle(db, section_id: str, target_parent_id: str) -> bool:
    """Walk from target_parent_id up to root; return True if section_id appears."""
    current_id = target_parent_id
    visited = set()
    while current_id:
        if current_id == section_id:
            return True
        if current_id in visited:
            return True
        visited.add(current_id)
        if not ObjectId.is_valid(current_id):
            return False
        parent = await db["sections"].find_one(
            {"_id": ObjectId(current_id), "deleted": {"$ne": True}}
        )
        if not parent:
            return False
        current_id = parent.get("parent_id")
    return False


async def _collect_descendant_sections(db, section_id: str, visited: set | None = None) -> list:
    """Collect all descendant sections recursively with cycle guard."""
    if visited is None:
        visited = set()
    if section_id in visited:
        return []
    visited.add(section_id)
    descendants = []
    children = (
        await db["sections"].find({"parent_id": section_id, "deleted": {"$ne": True}}).to_list(None)
    )
    for child in children:
        descendants.append(child)
        descendants.extend(await _collect_descendant_sections(db, str(child["_id"]), visited))
    return descendants


async def _collect_content_paths(db, section_id: str, section_path: str) -> list:
    """Collect all content slugs in a section, returning (old_full_path, slug, content_id, content_type)."""
    items = []
    for collection_name, content_type in CONTENT_COLLECTIONS:
        cursor = db[collection_name].find({"section_id": section_id, "deleted": {"$ne": True}})
        async for doc in cursor:
            slug = doc.get("slug")
            if slug:
                items.append((f"{section_path}/{slug}", slug, str(doc["_id"]), content_type))
    return items


@router.put("/content/{content_type}/{content_id}/move")
async def move_content(request: Request, content_type: str, content_id: str):
    """Move a content item to a different section."""
    await verify_auth(request)
    db = await get_db()

    # Validate content_type
    if content_type not in CONTENT_TYPE_TO_COLLECTION:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content_type. Must be one of: {', '.join(sorted(CONTENT_TYPE_TO_COLLECTION.keys()))}",
        )

    collection_name = CONTENT_TYPE_TO_COLLECTION[content_type]

    if not ObjectId.is_valid(content_id):
        raise HTTPException(status_code=400, detail="Invalid content ID format")

    body = await request.json()
    target_section_id = body.get("target_section_id")
    if not target_section_id or not ObjectId.is_valid(target_section_id):
        raise HTTPException(status_code=400, detail="Invalid target_section_id")

    # Find the content item
    item = await db[collection_name].find_one(
        {"_id": ObjectId(content_id), "deleted": {"$ne": True}}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    current_section_id = item.get("section_id")

    # Same section: no-op
    if current_section_id == target_section_id:
        result = dict(item)
        result["id"] = str(result.pop("_id"))
        return result

    # Find old section
    if not current_section_id or not ObjectId.is_valid(current_section_id):
        raise HTTPException(status_code=400, detail="Content has no valid current section")

    old_section = await db["sections"].find_one(
        {"_id": ObjectId(current_section_id), "deleted": {"$ne": True}}
    )
    if not old_section:
        raise HTTPException(status_code=404, detail="Current section not found")

    # Find target section
    target_section = await db["sections"].find_one(
        {"_id": ObjectId(target_section_id), "deleted": {"$ne": True}}
    )
    if not target_section:
        raise HTTPException(status_code=404, detail="Target section not found")

    slug = item.get("slug")

    # Slug collision check
    existing = await db[collection_name].find_one(
        {
            "section_id": target_section_id,
            "slug": slug,
            "deleted": {"$ne": True},
        }
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Target section already has content with slug '{slug}'",
        )

    # Update section_id
    try:
        await db[collection_name].update_one(
            {"_id": ObjectId(content_id)},
            {"$set": {"section_id": target_section_id, "updatedDate": datetime.now(timezone.utc)}},
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail=f"Target section already has content with slug '{slug}'",
        )

    # Write redirect
    old_path = f"{old_section['path']}/{slug}"
    new_path = f"{target_section['path']}/{slug}"
    await write_redirect(db, old_path, new_path, content_id, content_type)

    logger.info_with_context(
        "Content moved",
        {
            "content_type": content_type,
            "content_id": content_id,
            "from_section": current_section_id,
            "to_section": target_section_id,
            "old_path": old_path,
            "new_path": new_path,
        },
    )

    # Return updated item
    updated = await db[collection_name].find_one(
        {"_id": ObjectId(content_id), "deleted": {"$ne": True}}
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated document")
    result = dict(updated)
    result["id"] = str(result.pop("_id"))
    return result


@router.put("/sections/{section_id}/move")
async def move_section(request: Request, section_id: str):
    """Move a section to a different parent."""
    await verify_auth(request)
    db = await get_db()

    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID format")

    body = await request.json()
    target_parent_id = body.get("target_parent_id")  # Can be None for root

    # Find the section
    section = await db["sections"].find_one({"_id": ObjectId(section_id), "deleted": {"$ne": True}})
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    current_parent_id = section.get("parent_id")

    # Same parent: no-op
    if current_parent_id == target_parent_id:
        result = dict(section)
        result["id"] = str(result.pop("_id"))
        return result

    # Cycle detection
    if target_parent_id:
        if not ObjectId.is_valid(target_parent_id):
            raise HTTPException(status_code=400, detail="Invalid target_parent_id")
        if await would_create_cycle(db, section_id, target_parent_id):
            raise HTTPException(status_code=400, detail="Move would create a cycle")

        # Verify target parent exists
        target_parent = await db["sections"].find_one(
            {"_id": ObjectId(target_parent_id), "deleted": {"$ne": True}}
        )
        if not target_parent:
            raise HTTPException(status_code=404, detail="Target parent section not found")
        target_parent_path = target_parent["path"]
    else:
        target_parent_path = None

    # Slug collision check
    slug = section["slug"]
    collision_query = {
        "parent_id": target_parent_id,
        "slug": slug,
        "deleted": {"$ne": True},
        "_id": {"$ne": section["_id"]},
    }
    collision = await db["sections"].find_one(collision_query)
    if collision:
        raise HTTPException(
            status_code=409,
            detail=f"Target parent already has a child section with slug '{slug}'",
        )

    # Collect old paths before update
    old_section_path = section["path"]
    descendants = await _collect_descendant_sections(db, section_id)

    # Build old paths map: section_id -> old_path
    old_paths = {section_id: old_section_path}
    for desc in descendants:
        old_paths[str(desc["_id"])] = desc["path"]

    # Collect content paths before move
    old_content_paths = await _collect_content_paths(db, section_id, old_section_path)
    for desc in descendants:
        old_content_paths.extend(await _collect_content_paths(db, str(desc["_id"]), desc["path"]))

    # Compute new path
    new_path = f"{target_parent_path}/{slug}" if target_parent_path else slug

    # Update the section
    try:
        await db["sections"].update_one(
            {"_id": ObjectId(section_id)},
            {
                "$set": {
                    "parent_id": target_parent_id,
                    "path": new_path,
                    "updatedDate": datetime.now(timezone.utc),
                }
            },
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail=f"Target parent already has a child section with slug '{slug}'",
        )

    # Cascade path updates to descendants
    sections_collection = db["sections"]
    await cascade_path_updates(sections_collection, section_id, new_path)

    # Re-fetch descendants to get new paths
    updated_descendants = await _collect_descendant_sections(db, section_id)
    new_paths = {section_id: new_path}
    for desc in updated_descendants:
        new_paths[str(desc["_id"])] = desc["path"]

    # Write redirects for sections
    for sid, old_p in old_paths.items():
        new_p = new_paths.get(sid)
        if new_p and old_p != new_p:
            await write_redirect(db, old_p, new_p)

    # Write redirects for content
    for old_content_path, content_slug, cid, ctype in old_content_paths:
        # Figure out which section this content belongs to
        # and compute new content path from section's new path
        for sid, old_sp in old_paths.items():
            if old_content_path == f"{old_sp}/{content_slug}":
                new_sp = new_paths.get(sid)
                if new_sp:
                    new_content_path = f"{new_sp}/{content_slug}"
                    if old_content_path != new_content_path:
                        await write_redirect(db, old_content_path, new_content_path, cid, ctype)
                break

    logger.info_with_context(
        "Section moved",
        {
            "section_id": section_id,
            "from_parent": current_parent_id,
            "to_parent": target_parent_id,
            "old_path": old_section_path,
            "new_path": new_path,
        },
    )

    # Return updated section
    updated = await db["sections"].find_one({"_id": ObjectId(section_id), "deleted": {"$ne": True}})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated document")
    result = dict(updated)
    result["id"] = str(result.pop("_id"))
    return result
