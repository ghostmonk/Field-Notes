# Video Poster Frames

**Date:** 2026-03-25
**PR:** [#171](https://github.com/ghostmonk/Field-Notes/pull/171)
**Issue:** Closes #55

## What changed

Videos now display a poster frame (thumbnail preview) instead of a blank rectangle on mobile. Upload-time and existing content are both covered.

## New upload behavior

When uploading a video in the editor, a poster frame is automatically extracted at the 1-second mark using a hidden `<video>` + `<canvas>` element. The poster JPEG is uploaded alongside the video and set as the `poster` attribute. Real video dimensions (`videoWidth`/`videoHeight`) replace the hardcoded 1280x720 placeholder.

Poster extraction runs in parallel with the video upload — no added latency. If extraction fails (unsupported codec, etc.), the video uploads without a poster.

## Backfill migration

Migration `0013_backfill_video_posters` processes all existing content:

- Scans `stories`, `projects`, `pages` for `<video>` tags without `poster`
- Uses existing thumbnails from `video_processing_jobs` when available
- Falls back to FFmpeg extraction for videos without processing jobs
- Updates `src` to processed H.264 MP4 (720p) for non-MP4 originals that won't play on mobile Safari
- Backfills real dimensions from processing job metadata
- Works with both local storage and GCS

## Infrastructure

FFmpeg added to the backend Dockerfile for migration support.
