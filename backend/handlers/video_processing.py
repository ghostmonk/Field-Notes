"""
Video processing handler for managing video transcoding jobs and status.
"""

import uuid
from datetime import datetime, timezone
from typing import List

from database import get_database
from decorators.auth import requires_auth
from fastapi import APIRouter, HTTPException, Request
from glogger import logger
from models.video import (
    ThumbnailOption,
    ThumbnailSelectionRequest,
    ThumbnailSelectionResponse,
    VideoMetadata,
    VideoProcessingJob,
    VideoProcessingJobCreate,
    VideoProcessingJobCreateResponse,
    VideoProcessingJobDeleteResponse,
    VideoProcessingJobUpdate,
    VideoProcessingJobUpdateByFileRequest,
    VideoProcessingJobUpdateResponse,
)

router = APIRouter()


@router.post("/video-processing/jobs", response_model=VideoProcessingJobCreateResponse)
async def create_video_processing_job(
    job_data: VideoProcessingJobCreate,
) -> VideoProcessingJobCreateResponse:
    """Create a new video processing job (called by Cloud Function)"""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Create typed job object
        new_job = VideoProcessingJob(
            job_id=job_id,
            original_file=job_data.original_file,
            status="started",
            created_at=now,
            updated_at=now,
            metadata=job_data.metadata,
            thumbnail_options=[],
            selected_thumbnail_id="",
            processed_formats=[],
            error_message="",
        )

        # Convert to dict only for MongoDB insertion
        await video_jobs_collection.insert_one(new_job.model_dump())
        logger.info(f"Created video processing job: {job_id}")

        return VideoProcessingJobCreateResponse(
            job_id=job_id, status="started", message="Video processing job created successfully"
        )

    except Exception as e:
        logger.error(f"Error creating video processing job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


@router.patch("/video-processing/jobs/{job_id}", response_model=VideoProcessingJobUpdateResponse)
async def update_video_processing_job(
    job_id: str, update_data: VideoProcessingJobUpdate
) -> VideoProcessingJobUpdateResponse:
    """Update video processing job status (called by Cloud Function)."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        # Get only non-None fields from the update model
        update_fields = update_data.model_dump(exclude_none=True)

        # Always update the timestamp
        update_fields["updated_at"] = datetime.now(timezone.utc)

        result = await video_jobs_collection.update_one({"job_id": job_id}, {"$set": update_fields})

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        logger.info(f"Updated video processing job {job_id}: {update_fields}")
        return VideoProcessingJobUpdateResponse(
            status="updated", message=f"Video processing job {job_id} updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating video processing job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")


@router.patch("/video-processing/jobs/by-file", response_model=VideoProcessingJobUpdateResponse)
async def update_video_processing_job_by_file(
    request_data: VideoProcessingJobUpdateByFileRequest,
) -> VideoProcessingJobUpdateResponse:
    """Update video processing job by original file path (called by Cloud Function)."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        # Build update fields from the typed request
        update_fields = request_data.update_data.copy()
        update_fields["updated_at"] = datetime.now(timezone.utc)

        now = datetime.now(timezone.utc)
        result = await video_jobs_collection.update_one(
            {"original_file": request_data.original_file},
            {
                "$set": update_fields,
                "$setOnInsert": {
                    "job_id": str(uuid.uuid4()),
                    "original_file": request_data.original_file,
                    "created_at": now,
                },
            },
            upsert=True,
        )

        action = "created" if result.upserted_id else "updated"
        logger.info(
            f"{action.capitalize()} video processing job for file {request_data.original_file}"
        )
        return VideoProcessingJobUpdateResponse(
            status=action,
            message=f"Video processing job for {request_data.original_file} {action} successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating video processing job by file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")


@router.get("/video-processing/jobs/{job_id}", response_model=VideoProcessingJob)
@requires_auth
async def get_video_processing_job(request: Request, job_id: str) -> VideoProcessingJob:
    """Get video processing job status."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        job_doc = await video_jobs_collection.find_one({"job_id": job_id})

        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found")

        # Convert MongoDB document to Pydantic model
        job_doc["_id"] = str(job_doc["_id"])  # Convert ObjectId to string

        # Convert metadata to VideoMetadata object
        metadata_dict = job_doc["metadata"]
        job_doc["metadata"] = VideoMetadata(**metadata_dict)

        # Convert thumbnail options
        thumbnail_options = []
        for thumb_dict in job_doc.get("thumbnail_options", []):
            thumbnail_options.append(ThumbnailOption(**thumb_dict))
        job_doc["thumbnail_options"] = thumbnail_options

        return VideoProcessingJob(**job_doc)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video processing job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job: {str(e)}")


@router.get("/video-processing/jobs", response_model=List[VideoProcessingJob])
@requires_auth
async def list_video_processing_jobs(
    request: Request, status: str | None = None
) -> List[VideoProcessingJob]:
    """List video processing jobs, optionally filtered by status."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        query = {}
        if status:
            query["status"] = status

        cursor = video_jobs_collection.find(query).sort("created_at", -1).limit(50)
        jobs = []

        async for job_doc in cursor:
            job_doc["_id"] = str(job_doc["_id"])

            # Convert metadata
            metadata_dict = job_doc["metadata"]
            job_doc["metadata"] = VideoMetadata(**metadata_dict)

            # Convert thumbnail options
            thumbnail_options = []
            for thumb_dict in job_doc.get("thumbnail_options", []):
                thumbnail_options.append(ThumbnailOption(**thumb_dict))
            job_doc["thumbnail_options"] = thumbnail_options

            jobs.append(VideoProcessingJob(**job_doc))

        return jobs

    except Exception as e:
        logger.error(f"Error listing video processing jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.post(
    "/video-processing/jobs/{job_id}/select-thumbnail", response_model=ThumbnailSelectionResponse
)
@requires_auth
async def select_thumbnail(
    request: Request, job_id: str, thumbnail_data: ThumbnailSelectionRequest
) -> ThumbnailSelectionResponse:
    """Select a thumbnail for the video or upload a custom one."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        result = await video_jobs_collection.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "selected_thumbnail_id": thumbnail_data.thumbnail_id,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        logger.info(f"Selected thumbnail {thumbnail_data.thumbnail_id} for job {job_id}")
        return ThumbnailSelectionResponse(
            status="thumbnail_selected",
            thumbnail_id=thumbnail_data.thumbnail_id,
            message=f"Thumbnail {thumbnail_data.thumbnail_id} selected for job {job_id}",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting thumbnail for job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to select thumbnail: {str(e)}")


@router.delete("/video-processing/jobs/{job_id}", response_model=VideoProcessingJobDeleteResponse)
@requires_auth
async def delete_video_processing_job(
    request: Request, job_id: str
) -> VideoProcessingJobDeleteResponse:
    """Delete a video processing job."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        result = await video_jobs_collection.delete_one({"job_id": job_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        logger.info(f"Deleted video processing job: {job_id}")
        return VideoProcessingJobDeleteResponse(
            status="deleted", message=f"Video processing job {job_id} deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting video processing job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")


# Utility functions for video processing status
async def get_job_by_original_file(original_file: str) -> VideoProcessingJob | None:
    """Get processing job by original file path."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        job_doc = await video_jobs_collection.find_one({"original_file": original_file})

        if not job_doc:
            return None

        job_doc["_id"] = str(job_doc["_id"])
        metadata_dict = job_doc["metadata"]
        job_doc["metadata"] = VideoMetadata(**metadata_dict)

        thumbnail_options = []
        for thumb_dict in job_doc.get("thumbnail_options", []):
            thumbnail_options.append(ThumbnailOption(**thumb_dict))
        job_doc["thumbnail_options"] = thumbnail_options

        return VideoProcessingJob(**job_doc)

    except Exception as e:
        logger.error(f"Error getting job by file {original_file}: {str(e)}")
        return None


async def update_job_progress(job_id: str, progress_data: dict):
    """Update job progress with transcoding status."""
    try:
        db = await get_database()
        video_jobs_collection = db.video_processing_jobs

        await video_jobs_collection.update_one(
            {"job_id": job_id},
            {"$set": {"progress": progress_data, "updated_at": datetime.now(timezone.utc)}},
        )
        logger.info(f"Updated progress for job {job_id}")

    except Exception as e:
        logger.error(f"Error updating progress for job {job_id}: {str(e)}")
