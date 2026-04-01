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
from handlers.uploads import get_gcs_bucket

router = APIRouter()

LOCAL_STORAGE_PATH = os.environ.get("LOCAL_STORAGE_PATH")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")

# Asset ID pattern: YYYYMMDD_HHMMSS_8charhex
ASSET_ID_PATTERN = re.compile(r"(\d{8}_\d{6}_[a-f0-9]{8})")


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

        parts = path.split("/")
        if len(parts) < 2:
            continue

        if parts[0] == "images":
            asset_type = "image"
            variant = parts[1]
        elif parts[0] == "video":
            asset_type = "video"
            variant = parts[1]
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


def _build_asset_from_known_id(asset_id: str, base_path: Optional[str]) -> Optional[dict]:
    """Build an asset group by checking known variant paths for a single asset ID."""
    image_variants = [
        ("originals", ".webp"),
        ("large", ".webp"),
        ("medium", ".webp"),
        ("thumbnails", ".webp"),
    ]
    video_variants = [
        ("originals", ".mov"),
        ("originals", ".mp4"),
        ("originals", ".webm"),
        ("processed", ".mp4"),
        ("thumbnails", ".jpg"),
    ]

    found_variants = []
    total_size = 0
    asset_type = None

    if base_path:
        # Local filesystem: stat known paths directly
        for variant, ext in image_variants:
            fpath = os.path.join(base_path, "uploads", "images", variant, f"{asset_id}{ext}")
            if os.path.isfile(fpath):
                size = os.path.getsize(fpath)
                found_variants.append(
                    {
                        "variant": variant,
                        "path": f"images/{variant}/{asset_id}{ext}",
                        "size_bytes": size,
                    }
                )
                total_size += size
                asset_type = "image"

        for variant, ext in video_variants:
            fpath = os.path.join(base_path, "uploads", "video", variant, f"{asset_id}{ext}")
            if os.path.isfile(fpath):
                size = os.path.getsize(fpath)
                found_variants.append(
                    {
                        "variant": variant,
                        "path": f"video/{variant}/{asset_id}{ext}",
                        "size_bytes": size,
                    }
                )
                total_size += size
                asset_type = "video"
    else:
        # GCS: check blob existence
        bucket = get_gcs_bucket()
        for variant, ext in image_variants:
            blob_path = f"uploads/images/{variant}/{asset_id}{ext}"
            blob = bucket.blob(blob_path)
            if blob.exists():
                blob.reload()
                size = blob.size or 0
                found_variants.append(
                    {
                        "variant": variant,
                        "path": f"images/{variant}/{asset_id}{ext}",
                        "size_bytes": size,
                    }
                )
                total_size += size
                asset_type = "image"

        for variant, ext in video_variants:
            blob_path = f"uploads/video/{variant}/{asset_id}{ext}"
            blob = bucket.blob(blob_path)
            if blob.exists():
                blob.reload()
                size = blob.size or 0
                found_variants.append(
                    {
                        "variant": variant,
                        "path": f"video/{variant}/{asset_id}{ext}",
                        "size_bytes": size,
                    }
                )
                total_size += size
                asset_type = "video"

    if not found_variants:
        return None

    return {
        "asset_id": asset_id,
        "type": asset_type,
        "variants": found_variants,
        "total_size_bytes": total_size,
        "created_date": parse_created_date(asset_id),
    }


async def _collect_story_refs(collection, section_id: str) -> dict[str, list[dict]]:
    refs: dict[str, list[dict]] = {}
    cursor = collection.find(
        {"section_id": section_id},
        {"title": 1, "content": 1},
    )
    async for doc in cursor:
        if doc.get("content"):
            for aid in extract_asset_ids_from_html(doc["content"]):
                refs.setdefault(aid, []).append(
                    {
                        "content_type": "story",
                        "title": doc.get("title", ""),
                        "id": str(doc["_id"]),
                    }
                )
    return refs


async def _collect_project_refs(collection, section_id: str) -> dict[str, list[dict]]:
    refs: dict[str, list[dict]] = {}
    cursor = collection.find(
        {"section_id": section_id},
        {"title": 1, "content": 1, "image_url": 1},
    )
    async for doc in cursor:
        ids_found: set[str] = set()
        if doc.get("content"):
            ids_found.update(extract_asset_ids_from_html(doc["content"]))
        if doc.get("image_url"):
            img_id = extract_asset_ids_from_url(doc["image_url"])
            if img_id:
                ids_found.add(img_id)
        for aid in ids_found:
            refs.setdefault(aid, []).append(
                {
                    "content_type": "project",
                    "title": doc.get("title", ""),
                    "id": str(doc["_id"]),
                }
            )
    return refs


async def _collect_essay_refs(collection, section_id: str) -> dict[str, list[dict]]:
    refs: dict[str, list[dict]] = {}
    cursor = collection.find(
        {"section_id": section_id},
        {"title": 1, "cover_image_url": 1, "photos": 1},
    )
    async for doc in cursor:
        ids_found: set[str] = set()
        if doc.get("cover_image_url"):
            cid = extract_asset_ids_from_url(doc["cover_image_url"])
            if cid:
                ids_found.add(cid)
        for photo in doc.get("photos", []):
            pid = extract_asset_ids_from_url(photo.get("url", ""))
            if pid:
                ids_found.add(pid)
        for aid in ids_found:
            refs.setdefault(aid, []).append(
                {
                    "content_type": "photo_essay",
                    "title": doc.get("title", ""),
                    "id": str(doc["_id"]),
                }
            )
    return refs


@router.get("/assets/by-section/{section_id}")
@requires_auth
async def list_assets_by_section(
    request: Request,
    section_id: str,
    limit: int = 50,
    cursor: Optional[str] = None,
):
    try:
        stories_collection = await get_collection()
        projects_collection = await get_projects_collection()
        photo_essays_collection = await get_photo_essays_collection()

        # Run all three content scans concurrently
        story_refs, project_refs, essay_refs = await asyncio.gather(
            _collect_story_refs(stories_collection, section_id),
            _collect_project_refs(projects_collection, section_id),
            _collect_essay_refs(photo_essays_collection, section_id),
        )

        # Merge references
        referenced_assets: dict[str, list[dict]] = {}
        for refs in (story_refs, project_refs, essay_refs):
            for aid, ref_list in refs.items():
                referenced_assets.setdefault(aid, []).extend(ref_list)

        if not referenced_assets:
            return {"items": [], "next_cursor": None, "total_count": 0}

        # Build asset groups by probing known paths instead of scanning all files
        base_path = LOCAL_STORAGE_PATH if LOCAL_STORAGE_PATH else None

        async def build_asset(aid: str) -> Optional[dict]:
            asset = await asyncio.to_thread(_build_asset_from_known_id, aid, base_path)
            if asset:
                asset["referenced_by"] = referenced_assets[aid]
            return asset

        results = await asyncio.gather(*[build_asset(aid) for aid in referenced_assets])
        filtered = [a for a in results if a is not None]

        # Sort by date descending
        filtered.sort(key=lambda a: a["created_date"] or "", reverse=True)

        page, next_cursor = _paginate(filtered, limit, cursor)

        return {
            "items": page,
            "next_cursor": next_cursor,
            "total_count": len(filtered),
        }
    except Exception as e:
        logger.error(f"Error listing assets by section: {e}")
        raise HTTPException(status_code=500, detail="Failed to list section assets")
