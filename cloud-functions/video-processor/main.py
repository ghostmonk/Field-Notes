"""
FFmpeg-based video processing Cloud Function triggered by GCS uploads.
Handles video transcoding, thumbnail generation, and metadata extraction using FFmpeg.
"""

import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import ffmpeg
import functions_framework
import pymongo
import requests
from glogger import get_component_logger
from google.cloud import storage

# Initialize logging for video processor
logger = get_component_logger("video-processor")


def get_video_logger(video_id: str, **context):
    """Get a logger configured for a specific video processing job."""
    return logger.with_context(video_id=video_id, **context)


# Environment configuration
MONGODB_URI = os.environ.get("MONGODB_URI")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://api.ghostmonk.com")
GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")

# FFmpeg binary paths (installed via apt in container)
FFMPEG_PATH = "ffmpeg"
FFPROBE_PATH = "ffprobe"


@functions_framework.cloud_event
def process_video(cloud_event):
    """
    Cloud Function entry point triggered by GCS object finalization.

    Args:
        cloud_event: The CloudEvent that triggered this function
    """
    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]

    video_logger = get_video_logger(file_name, bucket=bucket_name)
    video_logger.info("Starting video processing")

    if not verify_ffmpeg_availability():
        logger.error("FFmpeg not available - cannot process video")
        return

    if not file_name.startswith("uploads/video/"):
        logger.info(f"Skipping non-video-folder file: {file_name}")
        return

    if "/thumbnails/" in file_name or "/processed/" in file_name:
        logger.info(f"Skipping generated file: {file_name}")
        return

    if not is_video_file(file_name):
        logger.info(f"Skipping non-video file: {file_name}")
        return

    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp()

        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)

        original_blob = bucket.blob(file_name)
        input_path = os.path.join(temp_dir, "input_video")
        original_blob.download_to_filename(input_path)

        logger.info(f"Downloaded video to {input_path}")

        metadata = extract_video_metadata(input_path)
        logger.info(f"Extracted metadata: {metadata}")

        thumbnails = generate_thumbnails(input_path, metadata, bucket, file_name, temp_dir)
        logger.info(f"Generated {len(thumbnails)} thumbnails")

        processed_formats = transcode_video(input_path, metadata, bucket, file_name, temp_dir)
        logger.info(f"Generated {len(processed_formats)} video formats")

        update_processing_job(
            file_name,
            {
                "status": "completed",
                "metadata": metadata,
                "thumbnail_options": thumbnails,
                "processed_formats": processed_formats,
            },
        )

        video_logger.info("Video processing completed successfully")

    except Exception as e:
        video_logger.error("Video processing failed", exception=e)

        update_processing_job(file_name, {"status": "failed", "error_message": str(e)})

        raise

    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up temporary directory: {temp_dir}")


def verify_ffmpeg_availability() -> bool:
    """Verify that FFmpeg binaries are available and executable."""
    try:
        # Test FFprobe execution with a simple command

        result = subprocess.run(
            [FFPROBE_PATH, "-version"], capture_output=True, text=True, check=True
        )
        logger.info(f"FFmpeg verified: {result.stdout.splitlines()[0]}")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg verification failed: {e}")
        return False
    except FileNotFoundError:
        logger.error("FFmpeg not found in system PATH")
        return False
    except Exception as e:
        logger.error(f"Unexpected error verifying FFmpeg: {str(e)}")
        return False


def is_video_file(filename: str) -> bool:
    """Check if file is a supported video format."""
    video_extensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".quicktime"]
    return any(filename.lower().endswith(ext) for ext in video_extensions)


def extract_video_metadata(input_path: str) -> Dict[str, Any]:
    """Extract video metadata using FFprobe via ffmpeg-python."""
    try:
        probe_data = ffmpeg.probe(input_path, cmd=FFPROBE_PATH)

        video_stream = None
        for stream in probe_data["streams"]:
            if stream["codec_type"] == "video":
                video_stream = stream
                break

        if not video_stream:
            raise ValueError("No video stream found")

        duration = float(probe_data["format"].get("duration", 0))
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))
        file_size = int(probe_data["format"].get("size", 0))

        return {
            "duration_seconds": duration,
            "width": width,
            "height": height,
            "file_size": file_size,
            "content_type": "video/mp4",
            "upload_time": datetime.now(timezone.utc),
        }

    except ffmpeg.Error as e:
        error_msg = e.stderr.decode("utf-8") if e.stderr else str(e)
        logger.error(f"FFprobe error: {error_msg}")
        raise ValueError(f"Failed to extract video metadata: {error_msg}")
    except Exception as e:
        logger.error(f"Unexpected error extracting metadata: {str(e)}")
        raise ValueError(f"Failed to extract video metadata: {str(e)}")


def generate_thumbnails(
    input_path: str,
    metadata: Dict[str, Any],
    bucket: storage.Bucket,
    original_file_name: str,
    temp_dir: str,
) -> List[Dict[str, Any]]:
    """Generate video thumbnails at various timestamps using FFmpeg."""
    thumbnails = []
    duration = metadata["duration_seconds"]

    timestamps = [duration * 0.1, duration * 0.3, duration * 0.5, duration * 0.7, duration * 0.9]

    base_name = Path(original_file_name).stem

    for i, timestamp in enumerate(timestamps):
        try:
            thumbnail_filename = f"{base_name}_thumb_{i}.jpg"
            thumbnail_path = os.path.join(temp_dir, thumbnail_filename)

            (
                ffmpeg.input(input_path, ss=timestamp)
                .filter("scale", 640, -2)
                .output(thumbnail_path, vframes=1, **{"q:v": 2})
                .overwrite_output()
                .run(quiet=True, cmd=FFMPEG_PATH)
            )

            thumbnail_blob_name = f"uploads/video/thumbnails/{thumbnail_filename}"
            thumbnail_blob = bucket.blob(thumbnail_blob_name)
            thumbnail_blob.upload_from_filename(thumbnail_path)

            thumbnail_blob.content_type = "image/jpeg"
            thumbnail_blob.cache_control = "public, max-age=3600"
            thumbnail_blob.patch()

            thumbnails.append(
                {
                    "id": f"thumb_{int(timestamp)}s",
                    "url": f"/{thumbnail_blob_name}",
                    "timestamp_seconds": timestamp,
                    "is_custom": False,
                }
            )

            logger.info(f"Generated thumbnail {i + 1}/5 at {timestamp:.1f}s")

        except ffmpeg.Error as e:
            error_msg = e.stderr.decode("utf-8") if e.stderr else str(e)
            logger.error(f"FFmpeg thumbnail error: {error_msg}")
            continue
        except Exception as e:
            logger.error(f"Unexpected error generating thumbnail {i}: {str(e)}")
            continue

    return thumbnails


def transcode_video(
    input_path: str,
    metadata: Dict[str, Any],
    bucket: storage.Bucket,
    original_file_name: str,
    temp_dir: str,
) -> List[Dict[str, Any]]:
    """Transcode video to multiple formats/qualities using FFmpeg."""
    processed_formats = []
    base_name = Path(original_file_name).stem

    original_width = metadata.get("width", 1920)
    original_height = metadata.get("height", 1080)
    # Use the larger dimension to determine if we need to scale down
    max_dim = max(original_width, original_height)
    target_qualities = [
        {"name": "mp4_720p", "max_dim": 1280, "bitrate": "2500k", "suffix": "_720p"},
        {"name": "mp4_480p", "max_dim": 854, "bitrate": "1000k", "suffix": "_480p"},
    ]

    for quality_config in target_qualities:
        try:
            if max_dim <= quality_config["max_dim"]:
                logger.info(
                    f"Skipping {quality_config['name']} - original video is smaller ({max_dim}px)"
                )
                continue

            # Scale so the longer side fits max_dim, preserve aspect ratio, even dimensions
            scale_filter = (
                f"scale={quality_config['max_dim']}:-2"
                if original_width >= original_height
                else f"scale=-2:{quality_config['max_dim']}"
            )

            output_filename = f"{base_name}{quality_config['suffix']}.mp4"
            output_path = os.path.join(temp_dir, output_filename)

            bitrate_num = int(quality_config["bitrate"].replace("k", ""))
            bufsize = f"{bitrate_num * 2}k"

            # Probe actual display dimensions after rotation
            probe = ffmpeg.probe(input_path, cmd=FFPROBE_PATH)
            video_stream = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
            display_w = (
                int(video_stream.get("width", original_width)) if video_stream else original_width
            )
            display_h = (
                int(video_stream.get("height", original_height))
                if video_stream
                else original_height
            )
            # Check for rotation metadata (90/270 degrees means portrait)
            rotation = 0
            if video_stream:
                rotation = abs(int(video_stream.get("tags", {}).get("rotate", "0")))
                if rotation == 0:
                    # Check side_data for display rotation
                    for sd in video_stream.get("side_data_list", []):
                        if "rotation" in sd:
                            rotation = abs(int(sd["rotation"]))
            is_portrait = rotation in (90, 270) or display_h > display_w

            if is_portrait:
                scale_filter = f"scale=-2:{quality_config['max_dim']}"
            else:
                scale_filter = f"scale={quality_config['max_dim']}:-2"

            logger.info(
                f"Transcoding to {quality_config['name']} (scale={scale_filter}, portrait={is_portrait})..."
            )

            (
                ffmpeg.input(input_path)
                .output(
                    output_path,
                    **{
                        "c:v": "libx264",
                        "preset": "medium",
                        "crf": "23",
                        "maxrate": quality_config["bitrate"],
                        "bufsize": bufsize,
                        "vf": scale_filter,
                        "c:a": "aac",
                        "b:a": "128k",
                        "movflags": "+faststart",
                    },
                )
                .overwrite_output()
                .run(quiet=True, cmd=FFMPEG_PATH)
            )

            # Get actual output dimensions
            out_probe = ffmpeg.probe(output_path, cmd=FFPROBE_PATH)
            out_stream = next((s for s in out_probe["streams"] if s["codec_type"] == "video"), None)
            actual_width = int(out_stream["width"]) if out_stream else quality_config["max_dim"]
            actual_height = int(out_stream["height"]) if out_stream else quality_config["max_dim"]

            processed_blob_name = f"uploads/video/processed/{output_filename}"
            processed_blob = bucket.blob(processed_blob_name)
            processed_blob.upload_from_filename(output_path)

            processed_blob.content_type = "video/mp4"
            processed_blob.cache_control = "public, max-age=3600"
            processed_blob.patch()

            processed_formats.append(
                {
                    "format": quality_config["name"],
                    "url": f"/{processed_blob_name}",
                    "width": actual_width,
                    "height": actual_height,
                }
            )

            logger.info(f"Successfully transcoded to {quality_config['name']}")

        except ffmpeg.Error as e:
            error_msg = e.stderr.decode("utf-8") if e.stderr else str(e)
            logger.error(f"FFmpeg transcoding error for {quality_config['name']}: {error_msg}")
            continue
        except Exception as e:
            logger.error(f"Unexpected error transcoding to {quality_config['name']}: {str(e)}")
            continue

    return processed_formats


def update_processing_job(original_file: str, update_data: Dict[str, Any]) -> None:
    """Update the video processing job in MongoDB."""
    try:
        response = requests.patch(
            f"{API_BASE_URL}/video-processing/jobs/by-file",
            json={"original_file": original_file, "update_data": update_data},
            timeout=30,
        )

        if response.status_code == 200:
            logger.info(f"Updated job for {original_file}")
        else:
            logger.warning(
                f"Failed to update job via API: {response.status_code} - {response.text}"
            )
            update_via_mongodb(original_file, update_data)

    except Exception as e:
        logger.error(f"Error updating job via API: {str(e)}")
        update_via_mongodb(original_file, update_data)


def update_via_mongodb(original_file: str, update_data: Dict[str, Any]) -> None:
    """Direct MongoDB update as fallback."""
    client = None
    try:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI environment variable not set")

        client = pymongo.MongoClient(MONGODB_URI)
        db = client.ghostmonk
        collection = db.video_processing_jobs

        update_data["updated_at"] = datetime.now(timezone.utc)

        result = collection.update_one(
            {"original_file": original_file},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "original_file": original_file,
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

        if result.upserted_id:
            logger.info(f"Created new job for {original_file} via MongoDB")
        else:
            logger.info(f"Updated job for {original_file} via MongoDB")

    except Exception as e:
        logger.error(f"Error updating job in MongoDB: {str(e)}")
        raise
    finally:
        if client:
            client.close()
