"""
Backfill video poster frames and fix mobile playback for existing content.

Scans stories, projects, and pages collections for <video> tags without poster
attributes. Uses thumbnail_options from video_processing_jobs when available,
otherwise extracts a poster frame locally via FFmpeg. Updates src to processed
MP4 format when available for mobile compatibility.
"""

import logging
import os
import re
import subprocess
import tempfile

import pymongo

try:
    from google.cloud import storage as gcs_storage
except ImportError:
    gcs_storage = None

logger = logging.getLogger(__name__)

name = "0013_backfill_video_posters"
dependencies = ["0012_seed_resume_data"]

COLLECTIONS = ["stories", "projects", "pages"]
VIDEO_TAG_RE = re.compile(r"<video\b[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r'([\w-]+)\s*=\s*"([^"]*)"')
BOOL_ATTR_RE = re.compile(r"\b(controls|muted|autoplay|loop|playsinline)\b(?!=)")


def _parse_attrs(tag_str):
    """Parse HTML attributes from a tag string into a dict."""
    return dict(ATTR_RE.findall(tag_str))


def _rebuild_tag(tag_str, attrs_update):
    """Rebuild a <video> tag with updated/added attributes, preserving boolean attrs."""
    existing = dict(ATTR_RE.findall(tag_str))
    existing.update(attrs_update)
    bool_attrs = set(BOOL_ATTR_RE.findall(tag_str))
    attr_str = " ".join(f'{k}="{v}"' for k, v in existing.items())
    if bool_attrs:
        attr_str += " " + " ".join(sorted(bool_attrs))
    return f"<video {attr_str}>"


def _src_to_blob_path(src):
    """Convert a video src URL path to a storage blob path.

    e.g. /uploads/timestamp_uuid.mp4 -> uploads/timestamp_uuid.mp4
    Full URLs like https://storage.googleapis.com/bucket/uploads/file.mp4 -> uploads/file.mp4
    """
    if src.startswith("https://"):
        # Extract path after bucket name: https://storage.googleapis.com/bucket/uploads/file.mp4 -> uploads/file.mp4
        parts = src.split("/", 4)  # ['https:', '', 'host', 'bucket', 'path']
        if len(parts) > 4:
            return parts[4]
        return src
    return src.lstrip("/")


def _download_gcs_blob(blob_path, dest_path):
    """Download a blob from GCS to a local path."""
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "")
    if not bucket_name or gcs_storage is None:
        return False
    client = gcs_storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    if not blob.exists():
        logger.warning(f"GCS blob does not exist: {blob_path}")
        return False
    blob.download_to_filename(dest_path)
    return True


def _upload_gcs_blob(local_path, blob_path):
    """Upload a local file to GCS. blob_path is relative (e.g. thumbnails/foo.jpg).
    Stored under uploads/ prefix in GCS to match construct_blob_path convention."""
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "")
    if not bucket_name or gcs_storage is None:
        return None
    gcs_blob_path = f"uploads/{blob_path}"
    client = gcs_storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_blob_path)
    blob.upload_from_filename(local_path)
    return f"/uploads/{blob_path}"


def _extract_poster_ffmpeg(video_path, output_path):
    """Extract a poster frame from a video using FFmpeg."""
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-ss",
                "1",
                "-i",
                video_path,
                "-frames:v",
                "1",
                "-q:v",
                "2",
                "-y",
                output_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        logger.warning("ffmpeg not found in PATH — skipping poster extraction")
        return False
    except subprocess.TimeoutExpired:
        logger.warning(f"FFmpeg timed out for {video_path}")
        return False
    if result.returncode != 0:
        logger.error(f"FFmpeg failed for {video_path}: {result.stderr}")
        return False
    return True


def _generate_poster_url(blob_path):
    """Generate a poster frame for a video and return its URL path."""
    local_storage = os.environ.get("LOCAL_STORAGE_PATH", "")
    basename = os.path.splitext(os.path.basename(blob_path))[0]
    poster_filename = f"{basename}_poster.jpg"

    if local_storage:
        video_path = os.path.join(local_storage, blob_path)
        if not os.path.exists(video_path):
            logger.warning(f"Local video file not found: {video_path}")
            return None
        thumb_dir = os.path.join(local_storage, "uploads", "thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        poster_path = os.path.join(thumb_dir, poster_filename)
        if not _extract_poster_ffmpeg(video_path, poster_path):
            return None
        return f"/uploads/thumbnails/{poster_filename}"
    else:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_video = os.path.join(tmp_dir, os.path.basename(blob_path))
            if not _download_gcs_blob(blob_path, tmp_video):
                return None
            tmp_poster = os.path.join(tmp_dir, poster_filename)
            if not _extract_poster_ffmpeg(tmp_video, tmp_poster):
                return None
            gcs_blob_path = f"thumbnails/{poster_filename}"
            url = _upload_gcs_blob(tmp_poster, gcs_blob_path)
            return url


def _get_middle_thumbnail_url(thumbnail_options):
    """Get the middle thumbnail URL from a list of thumbnail options."""
    if not thumbnail_options:
        return None
    mid_idx = len(thumbnail_options) // 2
    thumb = thumbnail_options[mid_idx]
    if isinstance(thumb, dict):
        return thumb.get("url")
    return None


def _process_video_tag(match, jobs_collection):
    """Process a single <video> tag match, returning the updated tag."""
    tag_str = match.group(0)
    attrs = _parse_attrs(tag_str)

    if "poster" in attrs:
        return tag_str

    src = attrs.get("src", "")
    if not src:
        return tag_str

    blob_path = _src_to_blob_path(src)
    updates = {}

    job = jobs_collection.find_one({"original_file": blob_path})

    poster_url = None
    if job and job.get("thumbnail_options"):
        poster_url = _get_middle_thumbnail_url(job["thumbnail_options"])

    if not poster_url:
        poster_url = _generate_poster_url(blob_path)

    if poster_url:
        updates["poster"] = poster_url

    if job:
        processed = job.get("processed_formats", [])
        if not src.lower().endswith(".mp4"):
            for fmt in processed:
                if isinstance(fmt, dict) and fmt.get("format") == "mp4_720p":
                    updates["src"] = fmt["url"]
                    break

        metadata = job.get("metadata", {})
        if isinstance(metadata, dict):
            width = metadata.get("width")
            height = metadata.get("height")
            if width and height:
                updates["width"] = str(width)
                updates["height"] = str(height)

    if not updates:
        return tag_str

    logger.info(f"Updating video tag: src={src}, updates={updates}")
    return _rebuild_tag(tag_str, updates)


def upgrade(db: "pymongo.database.Database"):
    jobs_collection = db["video_processing_jobs"]

    for coll_name in COLLECTIONS:
        collection = db[coll_name]
        for doc in collection.find({"content": {"$regex": "<video"}}):
            content = doc.get("content", "")
            if not content:
                continue

            updated_content = VIDEO_TAG_RE.sub(
                lambda m: _process_video_tag(m, jobs_collection), content
            )

            if updated_content != content:
                collection.update_one({"_id": doc["_id"]}, {"$set": {"content": updated_content}})
                logger.info(f"Updated video posters in {coll_name} document {doc['_id']}")
                print(f"Updated video posters in {coll_name} document {doc['_id']}")


def downgrade(db: "pymongo.database.Database"):
    # Irreversible: poster attributes and rewritten src values remain in content.
    logger.warning("Migration 0013 downgrade is a no-op — poster attributes are not removed")
    pass
