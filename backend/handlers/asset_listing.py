import asyncio
import os
import re
from datetime import datetime, timezone
from typing import Optional

from database import (
    get_collection,
    get_photo_essays_collection,
    get_projects_collection,
)
from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Request
from glogger import logger

router = APIRouter()

LOCAL_STORAGE_PATH = os.environ.get("LOCAL_STORAGE_PATH")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")

# Asset ID pattern: YYYYMMDD_HHMMSS_8charhex
ASSET_ID_PATTERN = re.compile(r"(\d{8}_\d{6}_[a-f0-9]{8})")

IMAGE_VARIANT_DIRS = ["originals", "large", "medium", "thumbnails"]
VIDEO_VARIANT_DIRS = ["originals", "processed", "thumbnails"]


def extract_asset_id(filename: str) -> Optional[str]:
    stem = os.path.splitext(os.path.basename(filename))[0]
    match = ASSET_ID_PATTERN.search(stem)
    return match.group(1) if match else None


def parse_created_date(asset_id: str) -> Optional[str]:
    try:
        date_part = asset_id[:15]  # YYYYMMDD_HHMMSS
        dt = datetime.strptime(date_part, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except (ValueError, IndexError):
        return None


def _list_local_files(base_path: str, prefix: str) -> list[dict]:
    results = []
    scan_dir = (
        os.path.join(base_path, "uploads", prefix) if prefix else os.path.join(base_path, "uploads")
    )
    if not os.path.isdir(scan_dir):
        return results
    for root, _dirs, files in os.walk(scan_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, os.path.join(base_path, "uploads"))
            try:
                size = os.path.getsize(full_path)
            except OSError:
                size = 0
            results.append({"path": rel_path, "size_bytes": size})
    return results


def _list_gcs_files(prefix: str) -> list[dict]:
    from handlers.uploads import get_gcs_bucket

    bucket = get_gcs_bucket()
    blob_prefix = f"uploads/{prefix}" if prefix else "uploads/"
    blobs = bucket.list_blobs(prefix=blob_prefix)
    results = []
    for blob in blobs:
        rel_path = blob.name.replace("uploads/", "", 1)
        results.append(
            {
                "path": rel_path,
                "size_bytes": blob.size or 0,
            }
        )
    return results


def _group_files_into_assets(files: list[dict]) -> list[dict]:
    asset_map: dict[str, dict] = {}

    for f in files:
        path = f["path"]
        asset_id = extract_asset_id(path)
        if not asset_id:
            continue

        # Determine type and variant from path
        # Paths look like: images/originals/ID.webp or video/originals/ID.mp4
        parts = path.split("/")
        if len(parts) < 2:
            continue

        if parts[0] == "images":
            asset_type = "image"
            variant = parts[1] if len(parts) > 1 else "unknown"
        elif parts[0] == "video":
            asset_type = "video"
            variant = parts[1] if len(parts) > 1 else "unknown"
        else:
            continue

        if asset_id not in asset_map:
            asset_map[asset_id] = {
                "asset_id": asset_id,
                "type": asset_type,
                "variants": [],
                "total_size_bytes": 0,
                "created_date": parse_created_date(asset_id),
            }

        asset_map[asset_id]["variants"].append(
            {
                "variant": variant,
                "path": path,
                "size_bytes": f["size_bytes"],
            }
        )
        asset_map[asset_id]["total_size_bytes"] += f["size_bytes"]

    # Sort by created_date descending (newest first)
    assets = sorted(
        asset_map.values(),
        key=lambda a: a["created_date"] or "",
        reverse=True,
    )
    return assets


def _paginate(items: list, limit: int, cursor: Optional[str]) -> tuple[list, Optional[str]]:
    offset = int(cursor) if cursor else 0
    page = items[offset : offset + limit]
    next_offset = offset + limit
    next_cursor = str(next_offset) if next_offset < len(items) else None
    return page, next_cursor


@router.get("/assets/list")
@requires_auth
async def list_assets(
    request: Request,
    prefix: str = "",
    limit: int = 50,
    cursor: Optional[str] = None,
):
    try:
        if LOCAL_STORAGE_PATH:
            files = await asyncio.to_thread(_list_local_files, LOCAL_STORAGE_PATH, prefix)
        else:
            files = await asyncio.to_thread(_list_gcs_files, prefix)

        assets = _group_files_into_assets(files)
        page, next_cursor = _paginate(assets, limit, cursor)

        return {
            "items": page,
            "next_cursor": next_cursor,
            "total_count": len(assets),
        }
    except Exception as e:
        logger.error(f"Error listing assets: {e}")
        raise HTTPException(status_code=500, detail="Failed to list assets")


# --- Content association ---

ASSET_URL_PATTERN = re.compile(r"/uploads/(?:images|video)/\w+/([\w]+)\.\w+")


def extract_asset_ids_from_html(html: str) -> set[str]:
    ids = set()
    for match in ASSET_URL_PATTERN.finditer(html):
        candidate = match.group(1)
        if ASSET_ID_PATTERN.match(candidate):
            ids.add(candidate)
    return ids


def extract_asset_ids_from_url(url: str) -> Optional[str]:
    match = ASSET_URL_PATTERN.search(url)
    if match:
        candidate = match.group(1)
        if ASSET_ID_PATTERN.match(candidate):
            return candidate
    return None


@router.get("/assets/by-section/{section_id}")
@requires_auth
async def list_assets_by_section(
    request: Request,
    section_id: str,
    limit: int = 50,
    cursor: Optional[str] = None,
):
    try:
        # Fetch content for this section and extract referenced asset IDs
        stories_collection = await get_collection()
        projects_collection = await get_projects_collection()
        photo_essays_collection = await get_photo_essays_collection()

        referenced_assets: dict[str, list[dict]] = {}  # asset_id -> [{content_type, title, id}]

        # Stories
        stories_cursor = stories_collection.find(
            {"section_id": section_id},
            {"title": 1, "content": 1},
        )
        async for story in stories_cursor:
            if story.get("content"):
                for aid in extract_asset_ids_from_html(story["content"]):
                    referenced_assets.setdefault(aid, []).append(
                        {
                            "content_type": "story",
                            "title": story.get("title", ""),
                            "id": str(story["_id"]),
                        }
                    )

        # Projects
        projects_cursor = projects_collection.find(
            {"section_id": section_id},
            {"title": 1, "content": 1, "image_url": 1},
        )
        async for project in projects_cursor:
            ids_found: set[str] = set()
            if project.get("content"):
                ids_found.update(extract_asset_ids_from_html(project["content"]))
            if project.get("image_url"):
                img_id = extract_asset_ids_from_url(project["image_url"])
                if img_id:
                    ids_found.add(img_id)
            for aid in ids_found:
                referenced_assets.setdefault(aid, []).append(
                    {
                        "content_type": "project",
                        "title": project.get("title", ""),
                        "id": str(project["_id"]),
                    }
                )

        # Photo essays
        essays_cursor = photo_essays_collection.find(
            {"section_id": section_id},
            {"title": 1, "cover_image_url": 1, "photos": 1},
        )
        async for essay in essays_cursor:
            ids_found = set()
            if essay.get("cover_image_url"):
                cid = extract_asset_ids_from_url(essay["cover_image_url"])
                if cid:
                    ids_found.add(cid)
            for photo in essay.get("photos", []):
                pid = extract_asset_ids_from_url(photo.get("url", ""))
                if pid:
                    ids_found.add(pid)
            for aid in ids_found:
                referenced_assets.setdefault(aid, []).append(
                    {
                        "content_type": "photo_essay",
                        "title": essay.get("title", ""),
                        "id": str(essay["_id"]),
                    }
                )

        if not referenced_assets:
            return {"items": [], "next_cursor": None, "total_count": 0}

        # List all storage files and filter to referenced assets
        if LOCAL_STORAGE_PATH:
            files = await asyncio.to_thread(_list_local_files, LOCAL_STORAGE_PATH, "")
        else:
            files = await asyncio.to_thread(_list_gcs_files, "")

        all_assets = _group_files_into_assets(files)
        filtered = []
        for asset in all_assets:
            if asset["asset_id"] in referenced_assets:
                asset["referenced_by"] = referenced_assets[asset["asset_id"]]
                filtered.append(asset)

        page, next_cursor = _paginate(filtered, limit, cursor)

        return {
            "items": page,
            "next_cursor": next_cursor,
            "total_count": len(filtered),
        }
    except Exception as e:
        logger.error(f"Error listing assets by section: {e}")
        raise HTTPException(status_code=500, detail="Failed to list section assets")
