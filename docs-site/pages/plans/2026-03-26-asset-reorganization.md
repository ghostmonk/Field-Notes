# Asset Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize GCS storage so photos go under `uploads/photos/{section_id}/` and videos go under `uploads/video/`, with thumbnails and processed transcodes nested under video.

**Architecture:** Thread `section_id` from editor forms through the upload chain (hooks → proxy → backend). Update `construct_blob_path` to route images to `photos/{section_id}/` and videos to `video/`. Cloud function stores thumbnails/processed under `uploads/video/`. Migration moves all existing GCS files and rewrites content HTML URLs. Backend already handles `uploads/{any_path}` via the catch-all route.

**Tech Stack:** FastAPI (Python), Next.js (TypeScript), Google Cloud Storage, MongoDB, FFmpeg (cloud function)

---

### Task 1: Backend — accept `section_id` in upload endpoint

**Files:**
- Modify: `backend/handlers/uploads.py`
- Modify: `backend/tests/test_uploads.py`

**What to change:**

Add `section_id: str = Form("")` parameter to `upload_media()`. Pass it through `process_single_file()` → `process_image_file()`. For videos, ignore section_id (videos go to `video/` regardless).

In `process_image_file`, change filename construction:
```python
# Old: new_filename = generate_unique_filename(file.filename)
# New:
base_filename = generate_unique_filename(file.filename)
if section_id:
    new_filename = f"photos/{section_id}/{base_filename}"
else:
    new_filename = base_filename  # fallback for uploads without section context
```

In `process_video_file`, prefix with `video/`:
```python
base_filename = generate_unique_filename(file.filename)
new_filename = f"video/{base_filename}"
```

Update `original_file` in video processing job to use the new path: `f"uploads/video/{base_filename}"`.

Update `primary_url` for videos: `f"/uploads/video/{base_filename}"`.

All srcset URLs for images will naturally include the `photos/{section_id}/` prefix because they use `base_name` from the full `new_filename`.

**How to test locally:**
```bash
make dev-local
# Upload an image via the editor — check LOCAL_STORAGE_PATH for photos/{section_id}/ folder
# Upload a video — check LOCAL_STORAGE_PATH for video/ folder
```

**Commit:** `feat: route image uploads to photos/{section_id}/, videos to video/`

---

### Task 2: Frontend — thread section_id through upload hooks

**Files:**
- Modify: `frontend/src/hooks/uploads/useFileUpload.ts`
- Modify: `frontend/src/hooks/uploads/useImageUpload.ts`
- Modify: `frontend/src/hooks/uploads/useVideoUpload.ts`
- Modify: `frontend/src/modules/editor/components/RichTextEditor.tsx`
- Modify: `frontend/src/modules/editor/components/StoryEditorForm.tsx`
- Modify: `frontend/src/modules/editor/components/ProjectEditorForm.tsx`
- Modify: `frontend/src/modules/editor/components/PageEditorForm.tsx`
- Modify: `frontend/src/modules/photo-essays/components/PhotoEssayEditor.tsx`

**Changes:**

`useImageUpload` — add `sectionId` parameter:
```typescript
export function useImageUpload(editor: Editor | null, sectionId?: string): UseImageUploadReturn {
  // In upload call, pass section_id as extraField:
  baseUpload.upload(uploadFile, { image_filter: selectedFilter, section_id: sectionId || '' })
}
```

`useVideoUpload` — add `sectionId` parameter:
```typescript
export function useVideoUpload(editor: Editor | null, sectionId?: string): UseVideoUploadReturn {
  // Videos don't need section_id for storage, but poster upload does:
  baseUpload.upload(file)  // no section_id for video
  uploadPoster(posterFile, { section_id: sectionId || '' })  // poster goes with photos? or video/thumbnails?
}
```

Actually — poster frames should go under `video/thumbnails/` not `photos/`. The poster is generated client-side from the video. Don't pass section_id for poster uploads. The backend should detect poster uploads... or simpler: posters uploaded via the upload endpoint go to the flat `uploads/` path and the video processing job handles the real thumbnails. The client-side poster is a temporary fallback until the cloud function runs.

Revised: video poster from client upload stays at `uploads/{filename}` (no section prefix). The cloud function's thumbnails go to `uploads/video/thumbnails/`. This avoids complicating the upload hook.

`RichTextEditor` — accept `sectionId` prop, pass to hooks:
```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  sectionId?: string;
}
// Pass to: useImageUpload(editor, sectionId)
// Pass to: useVideoUpload(editor)  // no sectionId for video
```

Editor form components — pass `section.id` to `RichTextEditor`:
```tsx
<RichTextEditor content={...} onChange={...} sectionId={section?.id} />
```

`PhotoEssayEditor` — append `section_id` to FormData:
```typescript
const formData = new FormData();
formData.append('files', resized);
formData.append('section_id', sectionId);
```

**How to test:**
```bash
cd frontend && npx tsc --noEmit  # TypeScript compiles
make test-frontend-unit           # Unit tests pass
```

**Commit:** `feat: thread section_id through upload hooks to backend`

---

### Task 3: Cloud function — store under `uploads/video/`

**Files:**
- Modify: `cloud-functions/video-processor/main.py`

**Changes:**

1. Filter trigger — only process files under `uploads/video/` (not all of `uploads/`):
```python
if not file_name.startswith("uploads/video/") or not is_video_file(file_name):
    logger.info(f"Skipping non-video file: {file_name}")
    return
```

2. Thumbnails — store at `uploads/video/thumbnails/`:
```python
thumbnail_blob_name = f"uploads/video/thumbnails/{thumbnail_filename}"
```

3. Processed — store at `uploads/video/processed/`:
```python
processed_blob_name = f"uploads/video/processed/{output_filename}"
```

4. Fix thumbnail aspect ratio — use `scale=640:-2` (preserve aspect ratio).

5. Fix portrait detection — probe rotation metadata, scale based on orientation.

6. Fix output dimensions — probe actual output file dimensions via ffprobe after transcode.

7. URL format for thumbnail_options and processed_formats:
```python
"url": f"/uploads/video/thumbnails/{thumbnail_filename}"
"url": f"/uploads/video/processed/{output_filename}"
```

**How to test:**
- Deploy to staging or test with local Docker (cloud function requires FFmpeg + GCS)
- Verify generated files land at correct GCS paths

**Commit:** `feat: cloud function stores under uploads/video/, fix portrait/aspect-ratio`

---

### Task 4: Migration — move existing GCS files

**Files:**
- Create: `backend/migrations/0014_reorganize_assets.py`

**This migration does two things:**

**Part A: Move GCS files**

1. Move videos: `uploads/{video}.mov` → `uploads/video/{video}.mov`
2. Move thumbnails: `uploads/thumbnails/{thumb}.jpg` → `uploads/video/thumbnails/{thumb}.jpg`
3. Move processed: `uploads/processed/{video}.mp4` → `uploads/video/processed/{video}.mp4`
4. Move images: `uploads/{image}.webp` → `uploads/photos/{section_id}/{image}.webp`
   - For each image, determine section_id by finding the content document that references it
   - Build a map: `image_url → section_id` by scanning `stories`, `projects`, `pages`, `photo_essays`
   - Images not referenced in any content go to `uploads/photos/uncategorized/`

For local storage (LOCAL_STORAGE_PATH): use `os.rename` / `shutil.move`.
For GCS: use `bucket.copy_blob` + `blob.delete`.

**Part B: Update content URLs**

1. For each story/project/page: regex replace `/uploads/{filename}` → `/uploads/photos/{section_id}/{filename}` in `content` field, for all image references. Replace in both `src` and `srcset` attributes. Also replace `data-original-src`.

2. For video tags: replace `/uploads/{video}.mov` → `/uploads/video/{video}.mov`. Replace `/uploads/processed/{video}.mp4` → `/uploads/video/processed/{video}.mp4`. Replace `/uploads/thumbnails/{thumb}.jpg` → `/uploads/video/thumbnails/{thumb}.jpg`.

3. For photo essays: update `photos[].url`, `photos[].srcset`, `cover_image_url`, `cover_image_srcset`.

4. Update `video_processing_jobs`: update `original_file`, `thumbnail_options[].url`, `processed_formats[].url`.

**Key implementation detail:** Build the complete URL mapping BEFORE moving files. If the migration fails midway, files might be at old or new paths. The migration should be idempotent — check if file exists at destination before moving. Skip already-moved files.

**How to test:**
```bash
# Seed local DB with content containing old-style URLs
make dev-local
make migrate
# Verify URLs in content point to new paths
# Verify files exist at new paths in LOCAL_STORAGE_PATH
```

**Commit:** `feat: migration 0014 reorganizes GCS assets and updates content URLs`

---

### Task 5: Update migration 0013 for new paths

**Files:**
- Modify: `backend/migrations/0013_backfill_video_posters.py`

The poster backfill migration references old paths. Update:
- Blob path lookups to check `video/` prefix
- Poster URLs to use `video/thumbnails/`
- Processed URLs to use `video/processed/`
- `_src_to_blob_path` to handle both old and new URL formats

Or simpler: ensure migration 0014 runs AFTER 0013. If 0013 has already run (it has), then 0014 handles the path updates. No changes needed to 0013.

**Decision:** Skip this task. Migration 0014 will update all URLs including those set by 0013.

---

### Task 6: End-to-end testing

**Test locally with `make dev-local`:**

1. Start services, run migrations
2. Create a new story in section "scraps" — upload an image
   - Verify image lands at `LOCAL_STORAGE_PATH/uploads/photos/{scraps_section_id}/{filename}.webp`
   - Verify all 4 size variants are in the same directory
   - Verify srcset URLs in content HTML use `/uploads/photos/{section_id}/` prefix
3. Upload a video in the same story
   - Verify video lands at `LOCAL_STORAGE_PATH/uploads/video/{filename}.mov`
   - Verify poster (if extracted) lands at `LOCAL_STORAGE_PATH/uploads/{filename}_poster.jpg`
4. Verify existing content still renders (old migrated URLs work)
5. Run `make test` — 388+ backend tests pass
6. Run `make test-frontend-unit` — 269+ frontend tests pass
7. Run `make format` — clean

**Commit:** no code changes, just verification

---

### Task 7: Release notes

**Files:**
- Create: `docs-site/pages/releases/2026-03-26--asset-reorganization.md`
- Modify: `docs-site/pages/releases/_meta.ts`

**Commit:** `docs: add asset reorganization release notes`
