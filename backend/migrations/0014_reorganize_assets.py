"""
Reorganize all assets to section-based directory structure.

Moves files from flat uploads/ to:
  uploads/photos/{section_id}/{filename}.webp   (images + variants)
  uploads/video/{filename}.mov                  (original videos)
  uploads/video/thumbnails/{filename}.jpg       (poster frames)
  uploads/video/processed/{filename}.mp4        (H.264 transcodes)

Rewrites all content URLs in stories, projects, pages, photo_essays,
and video_processing_jobs to match the new paths.
"""

import logging
import os
import re
import shutil
from collections import defaultdict

import pymongo

try:
    from google.cloud import storage as gcs_storage
except ImportError:
    gcs_storage = None

logger = logging.getLogger(__name__)

name = "0014_reorganize_assets"
dependencies = ["0013_backfill_video_posters"]

CONTENT_COLLECTIONS = ["stories", "projects", "pages"]

IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".gif"}
VIDEO_EXTENSIONS = {".mov", ".mp4", ".webm", ".avi"}

# Match /uploads/{filename} URLs in content HTML (src, srcset, poster, data-original-src)
URL_RE = re.compile(r"/uploads/([\w._/-]+\.[\w]+)")

# Match URLs that are already reorganized (skip them)
ALREADY_MOVED_RE = re.compile(r"/uploads/(photos/|video/)")


def _is_image(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS


def _is_video(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in VIDEO_EXTENSIONS


def _new_image_path(filename, section_id):
    sid = section_id if section_id else "uncategorized"
    return f"photos/{sid}/{filename}"


def _new_video_path(filename):
    return f"video/{filename}"


def _build_url_map_from_content(content, section_id):
    """Extract /uploads/{filename} URLs from HTML content and build old->new map."""
    url_map = {}
    if not content:
        return url_map

    for match in URL_RE.finditer(content):
        full_match = match.group(0)
        # Skip already-reorganized URLs
        if ALREADY_MOVED_RE.match(full_match):
            continue
        filename = match.group(1)
        # Normalize double-prefix (legacy cloud function bug)
        normalized = filename
        if normalized.startswith("uploads/"):
            normalized = normalized[len("uploads/"):]
        # Route thumbnail/processed paths to video subdirs, not photos
        if normalized.startswith(("thumbnails/", "processed/")):
            # Use full_match as key so replacement matches what's actually in content
            _, new_u = _build_url_map_from_thumbnail_path(f"/uploads/{normalized}")
            if new_u:
                url_map[full_match] = new_u
            continue
        if _is_image(normalized):
            new_rel = _new_image_path(normalized, section_id)
        elif _is_video(normalized):
            new_rel = _new_video_path(normalized)
        else:
            continue
        # Use full_match as key to handle both normal and double-prefix URLs
        new_url = f"/uploads/{new_rel}"
        url_map[full_match] = new_url

    return url_map


def _build_url_map_from_thumbnail_path(url_path):
    """Map old thumbnail/processed URLs to new video subdirectory paths.

    Handles:
      /uploads/thumbnails/{fn}  -> /uploads/video/thumbnails/{fn}
      /uploads/processed/{fn}   -> /uploads/video/processed/{fn}
      /thumbnails/{fn}          -> /uploads/video/thumbnails/{fn}
      /processed/{fn}           -> /uploads/video/processed/{fn}

    Already correct paths (/uploads/video/thumbnails/...) are skipped.
    """
    if not url_path:
        return None, None

    # Already in the right place
    if url_path.startswith("/uploads/video/"):
        return None, None

    if "/thumbnails/" in url_path:
        fn = url_path.rsplit("/", 1)[-1]
        return url_path, f"/uploads/video/thumbnails/{fn}"
    if "/processed/" in url_path:
        fn = url_path.rsplit("/", 1)[-1]
        return url_path, f"/uploads/video/processed/{fn}"

    return None, None


def _normalize_url(url):
    """Fix legacy double-prefix URLs."""
    if url and url.startswith("/uploads/uploads/"):
        return url.replace("/uploads/uploads/", "/uploads/", 1)
    return url


def _apply_url_map(content, url_map):
    """Replace all old URLs with new URLs in content string."""
    if not content or not url_map:
        return content
    result = content
    # Sort by length descending to avoid partial replacements
    for old_url in sorted(url_map.keys(), key=len, reverse=True):
        result = result.replace(old_url, url_map[old_url])
    return result


def _url_to_blob_path(url_path):
    """Convert a URL path to a storage blob path by stripping leading slash."""
    return url_path.lstrip("/")


def _move_local_file(old_blob, new_blob, local_storage):
    """Move a file on local filesystem. Returns True if moved."""
    old_path = os.path.join(local_storage, old_blob)
    new_path = os.path.join(local_storage, new_blob)

    if not os.path.exists(old_path):
        return False
    if os.path.exists(new_path):
        logger.info(f"Destination already exists, skipping: {new_blob}")
        return False

    os.makedirs(os.path.dirname(new_path), exist_ok=True)
    shutil.move(old_path, new_path)
    logger.info(f"Moved local: {old_blob} -> {new_blob}")
    print(f"Moved local: {old_blob} -> {new_blob}")
    return True


def _move_gcs_file(old_blob_name, new_blob_name, bucket):
    """Move a file in GCS. Returns True if moved."""
    old_blob = bucket.blob(old_blob_name)
    if not old_blob.exists():
        return False
    new_blob = bucket.blob(new_blob_name)
    if new_blob.exists():
        logger.info(f"GCS destination already exists, skipping: {new_blob_name}")
        return False

    bucket.copy_blob(old_blob, bucket, new_blob_name)
    old_blob.delete()
    logger.info(f"Moved GCS: {old_blob_name} -> {new_blob_name}")
    print(f"Moved GCS: {old_blob_name} -> {new_blob_name}")
    return True


def _copy_local_file(old_blob, new_blob, local_storage):
    """Copy a file on local filesystem. Returns True if copied."""
    old_path = os.path.join(local_storage, old_blob)
    new_path = os.path.join(local_storage, new_blob)

    if not os.path.exists(old_path):
        return False
    if os.path.exists(new_path):
        logger.info(f"Destination already exists, skipping: {new_blob}")
        return False

    os.makedirs(os.path.dirname(new_path), exist_ok=True)
    shutil.copy2(old_path, new_path)
    logger.info(f"Copied local: {old_blob} -> {new_blob}")
    print(f"Copied local: {old_blob} -> {new_blob}")
    return True


def _delete_local_file(old_blob, local_storage):
    """Delete a file on local filesystem."""
    old_path = os.path.join(local_storage, old_blob)
    if os.path.exists(old_path):
        os.remove(old_path)
        logger.info(f"Deleted local original: {old_blob}")
        print(f"Deleted local original: {old_blob}")


def _copy_gcs_file(old_blob_name, new_blob_name, bucket):
    """Copy a file in GCS without deleting the original. Returns True if copied."""
    old_blob = bucket.blob(old_blob_name)
    if not old_blob.exists():
        return False
    new_blob = bucket.blob(new_blob_name)
    if new_blob.exists():
        logger.info(f"GCS destination already exists, skipping: {new_blob_name}")
        return False

    bucket.copy_blob(old_blob, bucket, new_blob_name)
    logger.info(f"Copied GCS: {old_blob_name} -> {new_blob_name}")
    print(f"Copied GCS: {old_blob_name} -> {new_blob_name}")
    return True


def _delete_gcs_file(old_blob_name, bucket):
    """Delete a file in GCS."""
    old_blob = bucket.blob(old_blob_name)
    if old_blob.exists():
        old_blob.delete()
        logger.info(f"Deleted GCS original: {old_blob_name}")
        print(f"Deleted GCS original: {old_blob_name}")


def upgrade(db: "pymongo.database.Database"):
    local_storage = os.environ.get("LOCAL_STORAGE_PATH", "")
    gcs_bucket_name = os.environ.get("GCS_BUCKET_NAME", "")

    bucket = None
    if gcs_bucket_name and gcs_storage:
        client = gcs_storage.Client()
        bucket = client.bucket(gcs_bucket_name)

    # Phase 1: Build complete URL mapping from all collections
    # Maps old_url -> set of new_urls (one file may map to multiple sections)
    global_url_map = defaultdict(set)

    # 1a. Content collections (stories, projects, pages)
    content_doc_updates = []  # (collection_name, doc_id, url_map)
    for coll_name in CONTENT_COLLECTIONS:
        collection = db[coll_name]
        for doc in collection.find({"content": {"$regex": "/uploads/"}}):
            content = doc.get("content", "")
            section_id = doc.get("section_id") or ""
            url_map = _build_url_map_from_content(content, section_id)
            if url_map:
                for old_u, new_u in url_map.items():
                    global_url_map[old_u].add(new_u)
                content_doc_updates.append((coll_name, doc["_id"], url_map))

    # 1b. Photo essays
    photo_essay_updates = []
    photo_essays = db["photo_essays"]
    for doc in photo_essays.find():
        section_id = doc.get("section_id") or ""
        doc_url_map = {}

        # cover_image_url
        cover_url = doc.get("cover_image_url", "")
        if cover_url and not ALREADY_MOVED_RE.match(cover_url):
            m = URL_RE.match(cover_url)
            if m and _is_image(m.group(1)):
                new_url = f"/uploads/{_new_image_path(m.group(1), section_id)}"
                doc_url_map[cover_url] = new_url
                global_url_map[cover_url].add(new_url)

        # cover_image_srcset
        cover_srcset = doc.get("cover_image_srcset", "") or ""
        for srcset_match in URL_RE.finditer(cover_srcset):
            full = srcset_match.group(0)
            if ALREADY_MOVED_RE.match(full):
                continue
            fn = srcset_match.group(1)
            if _is_image(fn):
                old_u = f"/uploads/{fn}"
                new_u = f"/uploads/{_new_image_path(fn, section_id)}"
                doc_url_map[old_u] = new_u
                global_url_map[old_u].add(new_u)

        # photos[].url and photos[].srcset
        photos = doc.get("photos", [])
        for photo in photos:
            photo_url = photo.get("url", "")
            if photo_url and not ALREADY_MOVED_RE.match(photo_url):
                m = URL_RE.match(photo_url)
                if m and _is_image(m.group(1)):
                    new_url = f"/uploads/{_new_image_path(m.group(1), section_id)}"
                    doc_url_map[photo_url] = new_url
                    global_url_map[photo_url].add(new_url)

            photo_srcset = photo.get("srcset", "") or ""
            for srcset_match in URL_RE.finditer(photo_srcset):
                full = srcset_match.group(0)
                if ALREADY_MOVED_RE.match(full):
                    continue
                fn = srcset_match.group(1)
                if _is_image(fn):
                    old_u = f"/uploads/{fn}"
                    new_u = f"/uploads/{_new_image_path(fn, section_id)}"
                    doc_url_map[old_u] = new_u
                    global_url_map[old_u].add(new_u)

        if doc_url_map:
            photo_essay_updates.append((doc["_id"], doc_url_map))

    # 1c. Video processing jobs
    video_job_updates = []
    video_jobs = db["video_processing_jobs"]
    for doc in video_jobs.find():
        doc_url_map = {}

        # original_file: stored as blob path like "uploads/filename.mov"
        orig = doc.get("original_file", "")
        if orig and not orig.startswith("uploads/video/"):
            # Strip uploads/ prefix to get filename
            fn = orig.replace("uploads/", "", 1) if orig.startswith("uploads/") else orig
            if _is_video(fn):
                new_blob = f"uploads/video/{fn}"
                doc_url_map[orig] = new_blob
                # Also add the URL form for content replacement
                global_url_map[f"/{orig}"].add(f"/{new_blob}")

        # thumbnail_options[].url
        thumbs = doc.get("thumbnail_options", [])
        for thumb in thumbs:
            if not isinstance(thumb, dict):
                continue
            thumb_url = _normalize_url(thumb.get("url", ""))
            old_u, new_u = _build_url_map_from_thumbnail_path(thumb_url)
            if old_u and new_u:
                doc_url_map[old_u] = new_u
                global_url_map[old_u].add(new_u)

        # processed_formats[].url (can be list of dicts or list of strings)
        processed = doc.get("processed_formats", [])
        for fmt in processed:
            if isinstance(fmt, dict):
                fmt_url = _normalize_url(fmt.get("url", ""))
            elif isinstance(fmt, str):
                fmt_url = _normalize_url(fmt)
            else:
                continue
            old_u, new_u = _build_url_map_from_thumbnail_path(fmt_url)
            if old_u and new_u:
                doc_url_map[old_u] = new_u
                global_url_map[old_u].add(new_u)

        if doc_url_map:
            video_job_updates.append((doc["_id"], doc_url_map))

    total_mappings = sum(len(v) for v in global_url_map.values())
    print(f"Built URL map with {len(global_url_map)} sources -> {total_mappings} destinations")
    logger.info(
        f"Built URL map with {len(global_url_map)} sources -> {total_mappings} destinations"
    )

    # Phase 2: Move all files (copy to each destination, then delete original)
    moved_count = 0
    for old_url, new_urls in global_url_map.items():
        old_blob = _url_to_blob_path(old_url)
        destinations = {_url_to_blob_path(u) for u in new_urls} - {old_blob}
        if not destinations:
            continue

        if len(destinations) == 1:
            # Single destination: move directly
            new_blob = next(iter(destinations))
            if local_storage:
                if _move_local_file(old_blob, new_blob, local_storage):
                    moved_count += 1
            elif bucket:
                if _move_gcs_file(old_blob, new_blob, bucket):
                    moved_count += 1
        else:
            # Multiple destinations: copy to each, then delete original
            copied = False
            for new_blob in destinations:
                if local_storage:
                    if _copy_local_file(old_blob, new_blob, local_storage):
                        moved_count += 1
                        copied = True
                elif bucket:
                    if _copy_gcs_file(old_blob, new_blob, bucket):
                        moved_count += 1
                        copied = True
            if copied:
                if local_storage:
                    _delete_local_file(old_blob, local_storage)
                elif bucket:
                    _delete_gcs_file(old_blob, bucket)

    print(f"Moved {moved_count} files")
    logger.info(f"Moved {moved_count} files")

    # Phase 3: Rewrite all content URLs

    # 3a. Content collections
    for coll_name, doc_id, url_map in content_doc_updates:
        collection = db[coll_name]
        doc = collection.find_one({"_id": doc_id})
        if not doc:
            continue
        content = doc.get("content", "")
        updated = _apply_url_map(content, url_map)
        if updated != content:
            collection.update_one({"_id": doc_id}, {"$set": {"content": updated}})
            print(f"Updated content in {coll_name} {doc_id}")
            logger.info(f"Updated content in {coll_name} {doc_id}")

    # 3b. Photo essays
    for doc_id, url_map in photo_essay_updates:
        doc = photo_essays.find_one({"_id": doc_id})
        if not doc:
            continue

        update_fields = {}

        # cover_image_url
        cover = doc.get("cover_image_url", "")
        new_cover = url_map.get(cover)
        if new_cover:
            update_fields["cover_image_url"] = new_cover

        # cover_image_srcset
        cover_srcset = doc.get("cover_image_srcset", "") or ""
        updated_srcset = _apply_url_map(cover_srcset, url_map)
        if updated_srcset != cover_srcset:
            update_fields["cover_image_srcset"] = updated_srcset

        # photos array
        photos = doc.get("photos", [])
        updated_photos = []
        photos_changed = False
        for photo in photos:
            new_photo = dict(photo)
            photo_url = photo.get("url", "")
            if photo_url in url_map:
                new_photo["url"] = url_map[photo_url]
                photos_changed = True
            photo_srcset = photo.get("srcset", "") or ""
            new_srcset = _apply_url_map(photo_srcset, url_map)
            if new_srcset != photo_srcset:
                new_photo["srcset"] = new_srcset
                photos_changed = True
            updated_photos.append(new_photo)

        if photos_changed:
            update_fields["photos"] = updated_photos

        if update_fields:
            photo_essays.update_one({"_id": doc_id}, {"$set": update_fields})
            print(f"Updated photo_essay {doc_id}")
            logger.info(f"Updated photo_essay {doc_id}")

    # 3c. Video processing jobs
    for doc_id, doc_map in video_job_updates:
        doc = video_jobs.find_one({"_id": doc_id})
        if not doc:
            continue

        update_fields = {}

        # original_file (blob path)
        orig = doc.get("original_file", "")
        if orig in doc_map:
            update_fields["original_file"] = doc_map[orig]

        # thumbnail_options
        thumbs = doc.get("thumbnail_options", [])
        updated_thumbs = []
        thumbs_changed = False
        for thumb in thumbs:
            if not isinstance(thumb, dict):
                updated_thumbs.append(thumb)
                continue
            new_thumb = dict(thumb)
            thumb_url = thumb.get("url", "")
            if thumb_url in doc_map:
                new_thumb["url"] = doc_map[thumb_url]
                thumbs_changed = True
            updated_thumbs.append(new_thumb)
        if thumbs_changed:
            update_fields["thumbnail_options"] = updated_thumbs

        # processed_formats (list of dicts or strings)
        processed = doc.get("processed_formats", [])
        updated_processed = []
        proc_changed = False
        for fmt in processed:
            if isinstance(fmt, dict):
                new_fmt = dict(fmt)
                fmt_url = fmt.get("url", "")
                if fmt_url in doc_map:
                    new_fmt["url"] = doc_map[fmt_url]
                    proc_changed = True
                updated_processed.append(new_fmt)
            elif isinstance(fmt, str):
                if fmt in doc_map:
                    updated_processed.append(doc_map[fmt])
                    proc_changed = True
                else:
                    updated_processed.append(fmt)
            else:
                updated_processed.append(fmt)
        if proc_changed:
            update_fields["processed_formats"] = updated_processed

        if update_fields:
            video_jobs.update_one({"_id": doc_id}, {"$set": update_fields})
            print(f"Updated video_processing_job {doc_id}")
            logger.info(f"Updated video_processing_job {doc_id}")

    print("Migration 0014 complete")
    logger.info("Migration 0014 complete")


def downgrade(db: "pymongo.database.Database"):
    logger.warning(
        "Migration 0014 downgrade is irreversible — files have been moved "
        "and content URLs rewritten. Manual restoration required."
    )
    print(
        "WARNING: Migration 0014 downgrade is irreversible — files have been moved "
        "and content URLs rewritten. Manual restoration required."
    )
