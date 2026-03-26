# Asset Reorganization

**Date:** 2026-03-26
**PR:** [#173](https://github.com/ghostmonk/Field-Notes/pull/173)
**Issue:** Closes #172

## What changed

All uploaded media is now organized by type and section instead of a flat `uploads/` folder.

**New structure:**
```
uploads/
  photos/{section_id}/    images grouped by the section they belong to
  video/                  original video files
  video/thumbnails/       poster frames (5 per video)
  video/processed/        H.264 transcodes (720p, 480p)
```

## Upload flow changes

- Backend `/uploads` endpoint accepts `section_id` as a Form parameter
- Images are stored at `photos/{section_id}/{filename}` when section context is available
- Videos are stored at `video/{filename}` regardless of section
- Frontend editor forms thread `section_id` through `RichTextEditor` to `useImageUpload` to the upload proxy
- Photo essay editor appends `section_id` to its direct FormData uploads

## Cloud function changes

- Trigger filter changed from `uploads/` to `uploads/video/` prefix
- Thumbnails stored at `uploads/video/thumbnails/` (was `thumbnails/`)
- Processed transcodes stored at `uploads/video/processed/` (was `processed/`)
- Cascade events (thumbnails, processed files) explicitly skipped
- Portrait video detection via rotation metadata
- Aspect-ratio-preserving thumbnails (640:-2 instead of 640:360)
- Actual output dimensions probed from transcoded files

## Migration 0014

Moves all existing GCS files and rewrites all content URLs:

- Images moved from `uploads/{file}.webp` to `uploads/photos/{section_id}/{file}.webp` (section determined from containing document)
- Videos moved from `uploads/{file}.mov` to `uploads/video/{file}.mov`
- Thumbnails consolidated from `thumbnails/` and `uploads/thumbnails/` to `uploads/video/thumbnails/`
- Processed consolidated from `processed/` and `uploads/processed/` to `uploads/video/processed/`
- All `src`, `srcset`, `poster`, and `data-original-src` attributes in HTML content updated
- Photo essay `photos[].url`, `cover_image_url`, and srcset fields updated
- Video processing job paths updated
- Idempotent: checks destination before moving, skips already-moved URLs
