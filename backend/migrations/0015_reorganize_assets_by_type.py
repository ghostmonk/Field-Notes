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

# Already-migrated pattern to skip
ALREADY_MIGRATED_IMAGE_RE = re.compile(r"/uploads/images/")

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


def _rewrite_content(content):
    """Rewrite image URLs in a content string. Returns (new_content, changed).

    Video original URLs are NOT rewritten — moving video files in GCS would trigger
    the Eventarc video processor Cloud Function, causing unnecessary re-processing.
    Old videos stay at uploads/video/{filename}, new uploads go to video/originals/.
    """
    if not content:
        return content, False

    result = content

    # Rewrite image URLs only (skip already-migrated)
    result = IMAGE_URL_RE.sub(_rewrite_image_url, result)

    changed = result != content
    return result, changed


def _rewrite_url_field(url):
    """Rewrite a single image URL field value. Returns (new_url, changed)."""
    if not url:
        return url, False
    if ALREADY_MIGRATED_IMAGE_RE.search(url):
        return url, False
    new_url = IMAGE_URL_RE.sub(_rewrite_image_url, url)
    return new_url, new_url != url


def _rewrite_srcset(srcset):
    """Rewrite all URLs in a srcset string. Returns (new_srcset, changed)."""
    if not srcset:
        return srcset, False
    new_srcset = IMAGE_URL_RE.sub(_rewrite_image_url, srcset)
    return new_srcset, new_srcset != srcset


def _collect_file_moves_from_content(content):
    """Extract old->new blob path mappings for images from content HTML.

    Video originals are excluded — moving them in GCS would trigger Eventarc.
    """
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

    return moves


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


def _copy_gcs_file(old_blob_name, new_blob_name, bucket):
    """Copy a file in GCS without deleting original. Returns True if copied."""
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


def _delete_local_file(blob, local_storage):
    """Delete a file on local filesystem."""
    path = os.path.join(local_storage, blob)
    if os.path.exists(path):
        os.remove(path)
        logger.info(f"Deleted local: {blob}")
        print(f"Deleted local: {blob}")


def _delete_gcs_file(blob_name, bucket):
    """Delete a file in GCS."""
    blob = bucket.blob(blob_name)
    if blob.exists():
        blob.delete()
        logger.info(f"Deleted GCS: {blob_name}")
        print(f"Deleted GCS: {blob_name}")


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

    # Video files are NOT migrated — moving them in GCS triggers the Eventarc
    # video processor Cloud Function. Old videos stay at uploads/video/{filename},
    # new uploads go to video/originals/. Both paths are served correctly.

    print(f"Collected {len(all_moves)} file moves")
    logger.info(f"Collected {len(all_moves)} file moves")

    # Phase 2: Copy files to new locations (keep originals until URLs are rewritten)
    copied_pairs = []  # (old_blob, new_blob) pairs that were successfully copied
    for old_blob, new_blob in all_moves.items():
        if local_storage:
            if _copy_local_file(old_blob, new_blob, local_storage):
                copied_pairs.append((old_blob, new_blob))
        elif bucket:
            if _copy_gcs_file(old_blob, new_blob, bucket):
                copied_pairs.append((old_blob, new_blob))

    print(f"Copied {len(copied_pairs)} files to new locations")
    logger.info(f"Copied {len(copied_pairs)} files to new locations")

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

    # Video processing jobs are NOT updated — video files are not migrated.

    print(f"Updated {updated_count} documents")
    logger.info(f"Updated {updated_count} documents")

    # Phase 4: Delete old files now that URLs point to new locations
    deleted_count = 0
    for old_blob, _new_blob in copied_pairs:
        if local_storage:
            _delete_local_file(old_blob, local_storage)
            deleted_count += 1
        elif bucket:
            _delete_gcs_file(old_blob, bucket)
            deleted_count += 1

    print(f"Deleted {deleted_count} old files")
    logger.info(f"Deleted {deleted_count} old files")

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
