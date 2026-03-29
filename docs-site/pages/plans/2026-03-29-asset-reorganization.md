# Asset Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move assets from section-based paths (`uploads/photos/{section_id}/`) to type-based paths (`uploads/images/{variant}/{asset_id}.ext`) so content can move between sections without breaking asset URLs.

**Architecture:** New upload paths organized by media type and variant (originals, thumbnails, medium, large). Unique asset IDs are the only key. A database migration rewrites all URLs in content HTML. Upload handler updated to write to new paths. Both local filesystem and GCS supported.

**Tech Stack:** Python, FastAPI, MongoDB, PIL/Pillow, Google Cloud Storage

**Design Doc:** [Asset Storage](/features/nested-routing/asset-storage)

---

## Task 1: Upload Path Constants

**Files:**
- Modify: `backend/handlers/uploads.py`
- Test: `backend/tests/test_uploads.py`

**Step 1: Write failing tests for new path generation**

Add to `backend/tests/test_uploads.py`:

```python
class TestAssetPaths:
    """Tests for type-based asset path generation."""

    def test_image_original_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "image", "originals")
        assert path == "images/originals/20260329_143022_a7f3b2.webp"

    def test_image_thumbnail_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "image", "thumbnails")
        assert path == "images/thumbnails/20260329_143022_a7f3b2.webp"

    def test_image_medium_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "image", "medium")
        assert path == "images/medium/20260329_143022_a7f3b2.webp"

    def test_image_large_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "image", "large")
        assert path == "images/large/20260329_143022_a7f3b2.webp"

    def test_video_original_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "video", "originals", ext=".mov")
        assert path == "video/originals/20260329_143022_a7f3b2.mov"

    def test_video_processed_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "video", "processed")
        assert path == "video/processed/20260329_143022_a7f3b2.mp4"

    def test_video_thumbnail_path(self):
        from handlers.uploads import build_asset_path
        path = build_asset_path("20260329_143022_a7f3b2", "video", "thumbnails")
        assert path == "video/thumbnails/20260329_143022_a7f3b2.jpg"

    def test_invalid_media_type_raises(self):
        from handlers.uploads import build_asset_path
        import pytest
        with pytest.raises(ValueError, match="Unknown media type"):
            build_asset_path("id", "audio", "originals")

    def test_invalid_variant_raises(self):
        from handlers.uploads import build_asset_path
        import pytest
        with pytest.raises(ValueError, match="Unknown variant"):
            build_asset_path("id", "image", "huge")
```

**Step 2: Run tests to verify they fail**

Run: `make test`
Expected: FAIL — `build_asset_path` does not exist

**Step 3: Implement `build_asset_path`**

Add to `backend/handlers/uploads.py` near the top constants:

```python
# Asset path configuration — type-based, section-independent
IMAGE_VARIANTS = {
    "originals": ".webp",
    "thumbnails": ".webp",
    "medium": ".webp",
    "large": ".webp",
}

VIDEO_VARIANTS = {
    "originals": None,   # preserves original extension
    "processed": ".mp4",
    "thumbnails": ".jpg",
}

VARIANT_WIDTHS = {
    "thumbnails": 400,
    "medium": 768,
    "large": 1536,
    "originals": None,   # full size
}


def build_asset_path(asset_id: str, media_type: str, variant: str, ext: str | None = None) -> str:
    """Build storage path for an asset variant.

    Args:
        asset_id: Unique asset identifier (e.g. "20260329_143022_a7f3b2")
        media_type: "image" or "video"
        variant: Size/processing variant (e.g. "originals", "thumbnails", "medium")
        ext: Override file extension (for video originals with varying formats)

    Returns:
        Relative path like "images/originals/20260329_143022_a7f3b2.webp"
    """
    if media_type == "image":
        if variant not in IMAGE_VARIANTS:
            raise ValueError(f"Unknown variant '{variant}' for image. Valid: {list(IMAGE_VARIANTS.keys())}")
        extension = ext or IMAGE_VARIANTS[variant]
        return f"images/{variant}/{asset_id}{extension}"
    elif media_type == "video":
        if variant not in VIDEO_VARIANTS:
            raise ValueError(f"Unknown variant '{variant}' for video. Valid: {list(VIDEO_VARIANTS.keys())}")
        extension = ext or VIDEO_VARIANTS[variant]
        return f"video/{variant}/{asset_id}{extension}"
    else:
        raise ValueError(f"Unknown media type '{media_type}'. Valid: image, video")
```

**Step 4: Run tests to verify they pass**

Run: `make test`
Expected: All new `TestAssetPaths` tests PASS

**Step 5: Commit**

```bash
git add backend/handlers/uploads.py backend/tests/test_uploads.py
git commit -m "feat: add type-based asset path builder"
```

---

## Task 2: Update Image Upload to Use New Paths

**Files:**
- Modify: `backend/handlers/uploads.py` (the `process_image_file` function and `upload_file` callers)
- Test: `backend/tests/test_uploads.py`

**Step 1: Write failing test for new image upload paths**

Add to `backend/tests/test_uploads.py`:

```python
class TestImageUploadPaths:
    """Verify uploaded images go to type-based directories."""

    @pytest.mark.asyncio
    async def test_process_image_returns_new_path_format(self, async_client, mock_auth):
        """Upload an image and verify the returned URL uses the new path structure."""
        # Create a minimal valid PNG (1x1 pixel)
        import io
        from PIL import Image

        img = Image.new("RGB", (800, 600), color="red")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        response = await async_client.post(
            "/uploads",
            files={"files": ("test.png", buf, "image/png")},
            headers={"Authorization": "Bearer mock-token"},
        )

        assert response.status_code == 200
        data = response.json()
        url = data["urls"][0]

        # Should be /uploads/images/originals/{id}.webp, not /uploads/photos/{section_id}/
        assert "/images/originals/" in url
        assert url.endswith(".webp")
        assert "/photos/" not in url

        # Srcset should reference variant directories
        srcset = data["srcsets"][0]
        assert "/images/thumbnails/" in srcset
        assert "/images/medium/" in srcset or "/images/large/" in srcset
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL — URL still contains `/photos/{section_id}/`

**Step 3: Update `process_image_file` to use new paths**

Modify `process_image_file` in `backend/handlers/uploads.py`. The key changes:

1. Replace `f"photos/{section_id}/{base_name}"` with `build_asset_path(asset_id, "image", variant)`
2. Generate asset_id from the existing timestamp+random naming scheme
3. Build srcset from variant paths instead of `{base_name}_{size}`

The exact modifications depend on the current code structure — the implementer should:
- Extract the asset_id from the current `base_name` generation (the `{timestamp}_{random}` part)
- Replace every `upload_file` call's path argument with `build_asset_path()`
- Update srcset generation to use `build_asset_path()` for each size variant
- Map current sizes [2048, 1536, 768, 400] to variants [originals, large, medium, thumbnails]

**Step 4: Run tests to verify they pass**

Run: `make test`
Expected: New test PASSES. Existing upload tests may need path assertion updates.

**Step 5: Manual verification**

Run: `make dev-local`
Upload an image through the editor. Verify:
- File lands in `local-uploads/images/originals/` (not `local-uploads/photos/`)
- Thumbnail in `local-uploads/images/thumbnails/`
- Image renders correctly in the editor preview

**Step 6: Commit**

```bash
git add backend/handlers/uploads.py backend/tests/test_uploads.py
git commit -m "feat: route image uploads to type-based directories"
```

---

## Task 3: Update Video Upload to Use New Paths

**Files:**
- Modify: `backend/handlers/uploads.py` (the `process_video_file` function)
- Modify: `backend/handlers/video_processing.py` (job paths)
- Test: `backend/tests/test_uploads.py`

**Step 1: Write failing test for new video upload paths**

```python
class TestVideoUploadPaths:
    @pytest.mark.asyncio
    async def test_video_upload_returns_new_path_format(self, async_client, mock_auth):
        """Upload a video and verify the returned URL uses the new path structure."""
        response = await async_client.post(
            "/uploads",
            files={"files": ("test.mov", b"fake-video-data", "video/quicktime")},
            headers={"Authorization": "Bearer mock-token"},
        )

        assert response.status_code == 200
        data = response.json()
        url = data["urls"][0]

        # Should be /uploads/video/originals/{id}.mov
        assert "/video/originals/" in url
        assert "/video/" in url
        # Should NOT be flat /uploads/video/{id}.mov
        assert url.count("/video/") == 1  # only one /video/ segment
```

**Step 2: Run test to verify it fails**

Run: `make test`
Expected: FAIL — URL still uses old flat path

**Step 3: Update video upload paths**

Modify `process_video_file` in `uploads.py`:
- Original video: `build_asset_path(asset_id, "video", "originals", ext=original_ext)`
- Update video processing job handler to write processed files to `build_asset_path(asset_id, "video", "processed")`
- Update poster/thumbnail to `build_asset_path(asset_id, "video", "thumbnails")`

**Step 4: Run tests**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/uploads.py backend/handlers/video_processing.py backend/tests/test_uploads.py
git commit -m "feat: route video uploads to type-based directories"
```

---

## Task 4: Migration — Move Existing Assets

**Files:**
- Create: `backend/migrations/0015_reorganize_assets_by_type.py`
- Test: `backend/tests/test_migrations/test_0015_reorganize_assets.py` (if migration test pattern exists, otherwise test via integration)

**Step 1: Write the migration**

Create `backend/migrations/0015_reorganize_assets_by_type.py`:

This migration must:
1. Scan all content collections (stories, projects, pages, photo_essays) for asset URLs
2. Parse URLs matching `/uploads/photos/{section_id}/{filename}` pattern
3. Move files to `/uploads/images/{variant}/{filename}` based on the size suffix
4. Rewrite URLs in content HTML (both `src` and `srcset` attributes)
5. Handle video files: move from `/uploads/video/{filename}` to `/uploads/video/originals/{filename}` (and processed/thumbnails variants)
6. Support both local filesystem and GCS bucket
7. Skip already-migrated URLs (those matching the new pattern)

The migration structure follows 0014's pattern but with reversed direction — from section-based to type-based.

**Key mapping:**
```python
# Old: /uploads/photos/{section_id}/{base}_{size}.webp
# New: /uploads/images/{variant}/{base}.webp
# Where: 400 -> thumbnails, 768 -> medium, 1536 -> large, full -> originals

SIZE_TO_VARIANT = {
    "400": "thumbnails",
    "768": "medium",
    "1536": "large",
}
# Files without a size suffix are originals
```

**Step 2: Test the migration locally**

Run: `make dev-local` (ensure local data exists with images)
Run: `make migrate`
Verify:
- Files moved to new directories
- Content still renders images correctly
- No broken image references in the editor

**Step 3: Write a downgrade function**

The downgrade must reverse the mapping. Since the old structure requires knowing the `section_id`, the downgrade should read `section_id` from each content document to reconstruct the old path.

**Step 4: Commit**

```bash
git add backend/migrations/0015_reorganize_assets_by_type.py
git commit -m "feat: migration to reorganize assets from section-based to type-based paths"
```

---

## Task 5: Update Frontend Asset Proxy (if applicable)

**Files:**
- Check: `frontend/src/pages/api/uploads/` or similar proxy routes
- Check: `frontend/next.config.js` for rewrite rules

**Step 1: Verify frontend serves new asset paths**

Run: `make dev-local`
Navigate to a page with images. Check browser network tab:
- Images should load from `/uploads/images/originals/{id}.webp`
- If 404, the frontend proxy or static file serving needs updating

**Step 2: Update any path assumptions**

If the Next.js config or API routes have hardcoded `/uploads/photos/` paths, update them to serve from `/uploads/images/` and `/uploads/video/`.

**Step 3: Commit if changes needed**

```bash
git commit -m "fix: update frontend asset serving for new type-based paths"
```

---

## Task 6: E2E Smoke Test for Uploads

**Files:**
- Modify: `frontend/e2e/test-data.ts` (update any hardcoded asset URLs)
- Modify: `frontend/e2e/mock-server.ts` (if upload endpoints are mocked)

**Step 1: Update test data asset URLs**

If `test-data.ts` contains hardcoded `/uploads/photos/` URLs, update them to `/uploads/images/originals/`.

**Step 2: Run existing e2e tests**

Run: `docker compose stop frontend && make test-frontend`
Expected: All existing tests pass with updated asset URLs.

**Step 3: Commit**

```bash
git add frontend/e2e/
git commit -m "test: update e2e test data for type-based asset paths"
```

---

## Task 7: Final Verification & Format

**Step 1: Run full test suite**

```bash
make format
make test
make test-frontend-unit
docker compose stop frontend && make test-frontend
```

All must pass.

**Step 2: Manual verification**

- `make dev-local`
- Browse existing content — all images and videos render
- Upload a new image — lands in `images/originals/`
- Upload a new video — lands in `video/originals/`
- Check srcset in browser inspector — variant URLs resolve

**Step 3: Final commit if any cleanup needed**

```bash
git commit -m "chore: format and cleanup after asset reorganization"
```
