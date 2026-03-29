"""
Reorganize assets from section-based paths to type-based paths.

Moves files from:
  uploads/photos/{section_id}/{base_name}.webp          -> uploads/images/originals/{base_name}.webp
  uploads/photos/{section_id}/{base_name}_1536.webp     -> uploads/images/large/{base_name}.webp
  uploads/photos/{section_id}/{base_name}_768.webp      -> uploads/images/medium/{base_name}.webp
  uploads/photos/{section_id}/{base_name}_400.webp      -> uploads/images/thumbnails/{base_name}.webp
  uploads/video/{filename}.mov                          -> uploads/video/originals/{filename}.mov

Rewrites all content URLs in stories, projects, pages, photo_essays,
and video_processing_jobs to match the new paths.
"""

import logging
import os
import re
import shutil

import pymongo

try:
    from google.cloud import storage as gcs_storage
except ImportError:
    gcs_storage = None

logger = logging.getLogger(__name__)

name = "0015_reorganize_assets_by_type"
dependencies = ["0014_reorganize_assets"]

CONTENT_COLLECTIONS = ["stories", "projects", "pages"]

# Matches image URLs under /uploads/photos/{section_id}/{base_name}[_suffix].webp
# Group 1: section_id, Group 2: base_name (without suffix), Group 3: size suffix (optional)
IMAGE_URL_RE = re.compile(r"/uploads/photos/([^/]+)/([^/_]+?)(_2048|_1536|_768|_400)?\.webp")

# Matches original video files directly under /uploads/video/ (not in subdirectories)
VIDEO_ORIG_RE = re.compile(r"/uploads/video/([^/]+\.\w+)")

# Already-migrated patterns to skip
ALREADY_MIGRATED_IMAGE_RE = re.compile(r"/uploads/images/")
ALREADY_MIGRATED_VIDEO_RE = re.compile(r"/uploads/video/originals/")

# Size suffix -> variant directory
SUFFIX_TO_VARIANT = {
    None: "originals",
    "": "originals",
    "_2048": "originals",
    "_1536": "large",
    "_768": "medium",
    "_400": "thumbnails",
}


def _rewrite_image_url(match):
    """Regex replacement function for image URLs."""
    base_name = match.group(2)
    suffix = match.group(3)
    variant = SUFFIX_TO_VARIANT.get(suffix, "originals")
    return f"/uploads/images/{variant}/{base_name}.webp"


def _rewrite_video_url(match):
    """Regex replacement function for video original URLs."""
    filename = match.group(1)
    return f"/uploads/video/originals/{filename}"


def _rewrite_content(content):
    """Rewrite all image and video URLs in a content string. Returns (new_content, changed)."""
    if not content:
        return content, False

    result = content

    # Rewrite image URLs (skip already-migrated)
    result = IMAGE_URL_RE.sub(_rewrite_image_url, result)

    # Rewrite video original URLs, but only those NOT already in a subdirectory
    # VIDEO_ORIG_RE only matches /uploads/video/{filename} (no intermediate dir)
    # We need to avoid matching /uploads/video/thumbnails/ or /uploads/video/processed/
    # or /uploads/video/originals/ — the regex already excludes paths with extra slashes
    result = VIDEO_ORIG_RE.sub(_rewrite_video_url, result)

    # The video regex is greedy and will also match already-correct paths like
    # /uploads/video/originals/foo.mov (capturing "originals/foo.mov" as filename).
    # But originals/foo.mov contains a slash, and [^/] prevents that. Safe.

    changed = result != content
    return result, changed


def _rewrite_url_field(url):
    """Rewrite a single URL field value. Returns (new_url, changed)."""
    if not url:
        return url, False
    # Skip already-migrated
    if ALREADY_MIGRATED_IMAGE_RE.search(url) or ALREADY_MIGRATED_VIDEO_RE.search(url):
        return url, False
    new_url = IMAGE_URL_RE.sub(_rewrite_image_url, url)
    new_url = VIDEO_ORIG_RE.sub(_rewrite_video_url, new_url)
    return new_url, new_url != url


def _rewrite_srcset(srcset):
    """Rewrite all URLs in a srcset string. Returns (new_srcset, changed)."""
    if not srcset:
        return srcset, False
    new_srcset = IMAGE_URL_RE.sub(_rewrite_image_url, srcset)
    return new_srcset, new_srcset != srcset


def _collect_file_moves_from_content(content):
    """Extract old->new blob path mappings from content HTML."""
    moves = {}
    if not content:
        return moves

    for match in IMAGE_URL_RE.finditer(content):
        old_url = match.group(0)
        if ALREADY_MIGRATED_IMAGE_RE.search(old_url):
            continue
        new_url = _rewrite_image_url(match)
        old_blob = old_url.lstrip("/")
        new_blob = new_url.lstrip("/")
        if old_blob != new_blob:
            moves[old_blob] = new_blob

    for match in VIDEO_ORIG_RE.finditer(content):
        old_url = match.group(0)
        if ALREADY_MIGRATED_VIDEO_RE.search(old_url):
            continue
        new_url = _rewrite_video_url(match)
        old_blob = old_url.lstrip("/")
        new_blob = new_url.lstrip("/")
        if old_blob != new_blob:
            moves[old_blob] = new_blob

    return moves


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


def upgrade(db: "pymongo.database.Database"):
    local_storage = os.environ.get("LOCAL_STORAGE_PATH", "")
    gcs_bucket_name = os.environ.get("GCS_BUCKET_NAME", "")

    bucket = None
    if gcs_bucket_name and gcs_storage:
        client = gcs_storage.Client()
        bucket = client.bucket(gcs_bucket_name)

    # Phase 1: Collect all file moves from all collections
    all_moves = {}  # old_blob -> new_blob

    # 1a. Content collections
    for coll_name in CONTENT_COLLECTIONS:
        collection = db[coll_name]
        for doc in collection.find({"content": {"$regex": "/uploads/photos/"}}):
            content = doc.get("content", "")
            moves = _collect_file_moves_from_content(content)
            all_moves.update(moves)

        # Also check for video originals in content
        for doc in collection.find({"content": {"$regex": "/uploads/video/"}}):
            content = doc.get("content", "")
            moves = _collect_file_moves_from_content(content)
            all_moves.update(moves)

    # 1b. Photo essays
    photo_essays = db["photo_essays"]
    for doc in photo_essays.find():
        cover_url = doc.get("cover_image_url", "") or ""
        cover_srcset = doc.get("cover_image_srcset", "") or ""
        for field_val in [cover_url, cover_srcset]:
            moves = _collect_file_moves_from_content(field_val)
            all_moves.update(moves)

        for photo in doc.get("photos", []):
            for field_val in [photo.get("url", ""), photo.get("srcset", "") or ""]:
                moves = _collect_file_moves_from_content(field_val)
                all_moves.update(moves)

    # 1c. Video processing jobs — original_file field (blob path, not URL)
    video_jobs = db["video_processing_jobs"]
    for doc in video_jobs.find():
        orig = doc.get("original_file", "") or ""
        # original_file is stored as blob path like "uploads/video/filename.mov"
        if orig.startswith("uploads/video/") and not orig.startswith("uploads/video/originals/"):
            filename = orig.replace("uploads/video/", "", 1)
            # Only move if it's a direct file (no subdirectory)
            if "/" not in filename:
                all_moves[orig] = f"uploads/video/originals/{filename}"

    print(f"Collected {len(all_moves)} file moves")
    logger.info(f"Collected {len(all_moves)} file moves")

    # Phase 2: Move files
    moved_count = 0
    for old_blob, new_blob in all_moves.items():
        if local_storage:
            if _move_local_file(old_blob, new_blob, local_storage):
                moved_count += 1
        elif bucket:
            if _move_gcs_file(old_blob, new_blob, bucket):
                moved_count += 1

    print(f"Moved {moved_count} files")
    logger.info(f"Moved {moved_count} files")

    # Phase 3: Rewrite URLs in database

    # 3a. Content collections
    updated_count = 0
    for coll_name in CONTENT_COLLECTIONS:
        collection = db[coll_name]
        for doc in collection.find(
            {
                "$or": [
                    {"content": {"$regex": "/uploads/photos/"}},
                    {"content": {"$regex": "/uploads/video/[^/]+\\.[a-z]"}},
                ]
            }
        ):
            content = doc.get("content", "")
            new_content, changed = _rewrite_content(content)
            if changed:
                collection.update_one({"_id": doc["_id"]}, {"$set": {"content": new_content}})
                updated_count += 1
                print(f"Updated content in {coll_name} {doc['_id']}")
                logger.info(f"Updated content in {coll_name} {doc['_id']}")

    # 3b. Photo essays
    for doc in photo_essays.find():
        update_fields = {}

        cover_url = doc.get("cover_image_url", "") or ""
        new_cover, changed = _rewrite_url_field(cover_url)
        if changed:
            update_fields["cover_image_url"] = new_cover

        cover_srcset = doc.get("cover_image_srcset", "") or ""
        new_srcset, changed = _rewrite_srcset(cover_srcset)
        if changed:
            update_fields["cover_image_srcset"] = new_srcset

        photos = doc.get("photos", [])
        updated_photos = []
        photos_changed = False
        for photo in photos:
            new_photo = dict(photo)

            photo_url = photo.get("url", "")
            new_url, changed = _rewrite_url_field(photo_url)
            if changed:
                new_photo["url"] = new_url
                photos_changed = True

            photo_srcset = photo.get("srcset", "") or ""
            new_ss, changed = _rewrite_srcset(photo_srcset)
            if changed:
                new_photo["srcset"] = new_ss
                photos_changed = True

            updated_photos.append(new_photo)

        if photos_changed:
            update_fields["photos"] = updated_photos

        if update_fields:
            photo_essays.update_one({"_id": doc["_id"]}, {"$set": update_fields})
            updated_count += 1
            print(f"Updated photo_essay {doc['_id']}")
            logger.info(f"Updated photo_essay {doc['_id']}")

    # 3c. Video processing jobs
    for doc in video_jobs.find():
        update_fields = {}

        orig = doc.get("original_file", "") or ""
        if orig.startswith("uploads/video/") and not orig.startswith("uploads/video/originals/"):
            filename = orig.replace("uploads/video/", "", 1)
            if "/" not in filename:
                update_fields["original_file"] = f"uploads/video/originals/{filename}"

        if update_fields:
            video_jobs.update_one({"_id": doc["_id"]}, {"$set": update_fields})
            updated_count += 1
            print(f"Updated video_processing_job {doc['_id']}")
            logger.info(f"Updated video_processing_job {doc['_id']}")

    print(f"Updated {updated_count} documents")
    logger.info(f"Updated {updated_count} documents")

    print("Migration 0015 complete")
    logger.info("Migration 0015 complete")


def downgrade(db: "pymongo.database.Database"):
    logger.warning(
        "Migration 0015 downgrade is irreversible — files have been moved "
        "and content URLs rewritten. Manual restoration required."
    )
    print(
        "WARNING: Migration 0015 downgrade is irreversible — files have been moved "
        "and content URLs rewritten. Manual restoration required."
    )
