# Image Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add client-side image resize, server-side Pillow filters with preview thumbnails, updated responsive variants, and global zoom-in-place image viewer.

**Architecture:** Client-side resize (Canvas API) runs before upload. Backend applies optional Pillow filters during image processing, generates filter preview thumbnails via new endpoint. `medium-zoom` library provides global image zoom with custom wheel/pinch enhancement. Frontend upload flow gains a filter picker step between file selection and alt text dialog.

**Tech Stack:** Pillow (ImageEnhance, ImageOps, Image.point), Canvas API, medium-zoom, React, FastAPI

---

### Task 1: Backend Image Filter Functions

**Files:**
- Create: `backend/handlers/image_filters.py`
- Create: `backend/tests/test_image_filters.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_image_filters.py
import io

import pytest
from PIL import Image

from handlers.image_filters import AVAILABLE_FILTERS, apply_filter


def _make_test_image(width=100, height=100, color=(128, 100, 80)):
    """Create a test RGB image."""
    img = Image.new("RGB", (width, height), color)
    return img


class TestApplyFilter:
    def test_none_filter_returns_unchanged_image(self):
        img = _make_test_image()
        result = apply_filter(img, "none")
        assert result.size == img.size
        assert list(result.getdata()) == list(img.getdata())

    def test_invalid_filter_returns_unchanged_image(self):
        img = _make_test_image()
        result = apply_filter(img, "nonexistent_filter")
        assert list(result.getdata()) == list(img.getdata())

    def test_bw_filter_returns_grayscale(self):
        img = _make_test_image(color=(200, 100, 50))
        result = apply_filter(img, "bw")
        # B&W filter converts to grayscale then back to RGB
        # All channels should be equal for each pixel
        r, g, b = result.split()
        assert list(r.getdata()) == list(g.getdata())

    def test_auto_enhance_changes_pixel_values(self):
        img = _make_test_image()
        result = apply_filter(img, "auto_enhance")
        assert list(result.getdata()) != list(img.getdata())

    def test_warm_filter_boosts_red_channel(self):
        img = _make_test_image(color=(128, 128, 128))
        result = apply_filter(img, "warm")
        orig_r = list(img.split()[0].getdata())[0]
        result_r = list(result.split()[0].getdata())[0]
        assert result_r > orig_r

    def test_cool_filter_boosts_blue_channel(self):
        img = _make_test_image(color=(128, 128, 128))
        result = apply_filter(img, "cool")
        orig_b = list(img.split()[2].getdata())[0]
        result_b = list(result.split()[2].getdata())[0]
        assert result_b > orig_b

    def test_vivid_filter_increases_saturation(self):
        img = _make_test_image(color=(128, 100, 80))
        result = apply_filter(img, "vivid")
        # Vivid increases color saturation - channels should diverge more
        assert list(result.getdata()) != list(img.getdata())

    def test_high_contrast_changes_values(self):
        img = _make_test_image()
        result = apply_filter(img, "high_contrast")
        assert list(result.getdata()) != list(img.getdata())

    def test_vintage_applies_sepia_tone(self):
        img = _make_test_image(color=(128, 128, 128))
        result = apply_filter(img, "vintage")
        assert list(result.getdata()) != list(img.getdata())

    def test_filter_preserves_image_size(self):
        img = _make_test_image(width=200, height=150)
        for filter_name in AVAILABLE_FILTERS:
            result = apply_filter(img, filter_name)
            assert result.size == (200, 150), f"Filter {filter_name} changed image size"

    def test_filter_returns_rgb_mode(self):
        img = _make_test_image()
        for filter_name in AVAILABLE_FILTERS:
            result = apply_filter(img, filter_name)
            assert result.mode == "RGB", f"Filter {filter_name} returned mode {result.mode}"


class TestAvailableFilters:
    def test_available_filters_contains_expected_names(self):
        expected = ["none", "auto_enhance", "warm", "cool", "high_contrast", "bw", "vivid", "vintage"]
        for name in expected:
            assert name in AVAILABLE_FILTERS

    def test_available_filters_is_list_of_strings(self):
        assert isinstance(AVAILABLE_FILTERS, list)
        assert all(isinstance(f, str) for f in AVAILABLE_FILTERS)
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_image_filters.py -v`
Expected: FAIL with ModuleNotFoundError for `handlers.image_filters`

**Step 3: Write the implementation**

```python
# backend/handlers/image_filters.py
from PIL import Image, ImageEnhance, ImageOps

AVAILABLE_FILTERS = [
    "none",
    "auto_enhance",
    "warm",
    "cool",
    "high_contrast",
    "bw",
    "vivid",
    "vintage",
]


def _adjust_channel(image: Image.Image, channel_index: int, offset: int) -> Image.Image:
    """Adjust a single RGB channel by an offset value."""
    channels = list(image.split())
    channels[channel_index] = channels[channel_index].point(
        lambda p: min(255, max(0, p + offset))
    )
    return Image.merge("RGB", channels)


def _filter_auto_enhance(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Sharpness(image).enhance(1.2)
    image = ImageEnhance.Color(image).enhance(1.1)
    return image


def _filter_warm(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Color(image).enhance(1.15)
    image = _adjust_channel(image, 0, 10)   # red +10
    image = _adjust_channel(image, 1, 5)    # green +5
    image = _adjust_channel(image, 2, -10)  # blue -10
    return image


def _filter_cool(image: Image.Image) -> Image.Image:
    image = _adjust_channel(image, 0, -10)  # red -10
    image = _adjust_channel(image, 2, 15)   # blue +15
    image = ImageEnhance.Contrast(image).enhance(1.1)
    return image


def _filter_high_contrast(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.4)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    return image


def _filter_bw(image: Image.Image) -> Image.Image:
    image = ImageOps.grayscale(image)
    image = image.convert("RGB")
    image = ImageEnhance.Contrast(image).enhance(1.2)
    return image


def _filter_vivid(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Color(image).enhance(1.5)
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image


def _filter_vintage(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Color(image).enhance(0.7)
    image = ImageEnhance.Contrast(image).enhance(0.95)
    # Apply sepia-like tone via channel adjustment
    image = _adjust_channel(image, 0, 15)   # red +15
    image = _adjust_channel(image, 1, 5)    # green +5
    image = _adjust_channel(image, 2, -20)  # blue -20
    return image


_FILTER_FUNCTIONS = {
    "auto_enhance": _filter_auto_enhance,
    "warm": _filter_warm,
    "cool": _filter_cool,
    "high_contrast": _filter_high_contrast,
    "bw": _filter_bw,
    "vivid": _filter_vivid,
    "vintage": _filter_vintage,
}


def apply_filter(image: Image.Image, filter_name: str) -> Image.Image:
    """Apply a named filter to an image. Returns the image unchanged for 'none' or unknown filters."""
    if filter_name == "none" or filter_name not in _FILTER_FUNCTIONS:
        return image.copy()
    return _FILTER_FUNCTIONS[filter_name](image.copy())
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_image_filters.py -v`
Expected: All PASS

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add backend/handlers/image_filters.py backend/tests/test_image_filters.py
git commit -m "feat: add Pillow image filter functions with tests"
```

---

### Task 2: Backend — Update Upload Endpoint for Filters and New Variant Sizes

**Files:**
- Modify: `backend/handlers/uploads.py` (lines 36-37 for IMAGE_SIZES, line 184-232 for process_image_file, line 291-293 for upload_media signature)
- Modify: `backend/models/upload.py` (update example srcset values)

**Step 1: Write the failing test**

```python
# backend/tests/test_uploads.py
import io
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from handlers.image_filters import AVAILABLE_FILTERS
from handlers.uploads import IMAGE_SIZES, process_image_file


def _create_test_image_bytes(width=2000, height=1500, format="JPEG"):
    """Create test image bytes."""
    img = Image.new("RGB", (width, height), (128, 100, 80))
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.read()


class TestImageSizes:
    def test_image_sizes_are_updated(self):
        assert IMAGE_SIZES == [2048, 1536, 768, 400]


class TestProcessImageFileWithFilter:
    @pytest.mark.asyncio
    async def test_process_image_with_none_filter(self):
        contents = _create_test_image_bytes()
        mock_file = MagicMock()
        mock_file.filename = "test.jpg"
        mock_file.content_type = "image/jpeg"

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")
            result = await process_image_file(mock_file, contents, len(contents), None, "none")

        assert result.primary_url is not None
        assert mock_upload.call_count == len(IMAGE_SIZES)

    @pytest.mark.asyncio
    async def test_process_image_with_bw_filter(self):
        contents = _create_test_image_bytes()
        mock_file = MagicMock()
        mock_file.filename = "test.jpg"
        mock_file.content_type = "image/jpeg"

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")
            result = await process_image_file(mock_file, contents, len(contents), None, "bw")

        assert result.primary_url is not None

    @pytest.mark.asyncio
    async def test_process_image_default_filter_is_none(self):
        """If no filter param passed, should work as before."""
        contents = _create_test_image_bytes()
        mock_file = MagicMock()
        mock_file.filename = "test.jpg"
        mock_file.content_type = "image/jpeg"

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")
            result = await process_image_file(mock_file, contents, len(contents), None)

        assert result.primary_url is not None
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_uploads.py -v`
Expected: FAIL — IMAGE_SIZES mismatch and process_image_file doesn't accept filter param

**Step 3: Modify uploads.py**

Changes to `backend/handlers/uploads.py`:

1. Update constants (line 36-37):
```python
MAX_IMAGE_LENGTH = 2048
IMAGE_SIZES = [2048, 1536, 768, 400]
```

2. Add import at top (after line 27):
```python
from handlers.image_filters import AVAILABLE_FILTERS, apply_filter
```

3. Update `process_image_file` signature and add filter application (line 184-232):
```python
async def process_image_file(
    file: UploadFile, contents: bytes, file_size: int, bucket,
    image_filter: str = "none"
) -> ProcessedMediaFile:
    """Process an image file and return ProcessedMediaFile."""
    validate_image(file.content_type, file_size)
    new_filename = generate_unique_filename(file.filename)
    base_name, extension = os.path.splitext(new_filename)
    webp_extension = f".{OUTPUT_FORMAT}"

    # Get original image dimensions for aspect ratio calculation
    original_image = Image.open(io.BytesIO(contents))
    original_image = ImageOps.exif_transpose(original_image)

    # Apply filter to original before generating variants
    if image_filter and image_filter != "none":
        original_image = apply_filter(original_image, image_filter)

    original_width, original_height = original_image.size

    # Save filtered original back to bytes for resize_image
    filtered_buf = io.BytesIO()
    original_image.save(filtered_buf, format="PNG")
    filtered_buf.seek(0)
    filtered_contents = filtered_buf.read()

    srcset_entries = []
    primary_url = None
    final_width = original_width
    final_height = original_height

    for size in IMAGE_SIZES:
        sized_filename = (
            f"{base_name}_{size}{webp_extension}"
            if size != max(IMAGE_SIZES)
            else f"{base_name}{webp_extension}"
        )
        resized_image = resize_image(filtered_contents, size)

        blob_path, _ = await upload_file(
            resized_image, sized_filename, f"image/{OUTPUT_FORMAT}", bucket
        )

        url = f"/uploads/{sized_filename}"
        srcset_entries.append(f"{url} {size}w")
        if size == max(IMAGE_SIZES):
            primary_url = url
            if original_width > size:
                final_width = size
                final_height = int(original_height * size / original_width)

    return ProcessedMediaFile(
        primary_url=primary_url,
        srcset=", ".join(srcset_entries),
        width=final_width,
        height=final_height,
    )
```

4. Update `process_single_file` to pass filter (line 171-181):
```python
async def process_single_file(file: UploadFile, bucket, image_filter: str = "none") -> ProcessedMediaFile:
    """Process a single uploaded file and return ProcessedMediaFile."""
    contents = await file.read()
    file_size = len(contents)

    if file.content_type in ALLOWED_IMAGE_TYPES:
        return await process_image_file(file, contents, file_size, bucket, image_filter)
    elif file.content_type in ALLOWED_VIDEO_TYPES:
        return await process_video_file(file, contents, file_size, bucket)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
```

5. Update `upload_media` endpoint to accept filter param (line 291-314):
```python
@router.post("/uploads", response_model=UploadResponse)
@requires_auth
async def upload_media(
    request: Request,
    files: List[UploadFile] = File(...),
    image_filter: str = Form("none"),
) -> UploadResponse:
```
And pass `image_filter` to `process_single_file`:
```python
processed_file = await process_single_file(file, bucket, image_filter)
```

Add `Form` to the FastAPI imports:
```python
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
```

6. Update `models/upload.py` example srcset:
```python
"srcset": "/uploads/20241201_123456_abc123_400.webp 400w, /uploads/20241201_123456_abc123_768.webp 768w, /uploads/20241201_123456_abc123_1536.webp 1536w, /uploads/20241201_123456_abc123.webp 2048w",
"width": 2048,
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_uploads.py backend/tests/test_image_filters.py -v`
Expected: All PASS

Also run full backend test suite to check for regressions:
Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make test`
Expected: All existing tests still pass

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add backend/handlers/uploads.py backend/handlers/image_filters.py backend/models/upload.py backend/tests/test_uploads.py
git commit -m "feat: update upload pipeline with filter support and new variant sizes"
```

---

### Task 3: Backend — Filter Preview Endpoint

**Files:**
- Modify: `backend/handlers/uploads.py` (add new endpoint)
- Modify: `backend/tests/test_uploads.py` (add preview tests)

**Step 1: Write the failing tests**

Add to `backend/tests/test_uploads.py`:

```python
class TestFilterPreviewEndpoint:
    @pytest.mark.asyncio
    async def test_filter_previews_returns_all_filters(self, async_client, mock_auth, auth_headers):
        img_bytes = _create_test_image_bytes(width=400, height=300)

        with patch("handlers.uploads.LOCAL_STORAGE_PATH", "/tmp/test-uploads"):
            with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
                mock_upload.return_value = ("uploads/preview.webp", "/uploads/preview.webp")
                response = await async_client.post(
                    "/uploads/filter-previews",
                    files={"file": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
                    headers=auth_headers,
                )

        assert response.status_code == 200
        data = response.json()
        assert "previews" in data
        for filter_name in AVAILABLE_FILTERS:
            if filter_name != "none":
                assert filter_name in data["previews"]

    @pytest.mark.asyncio
    async def test_filter_previews_requires_auth(self, async_client):
        img_bytes = _create_test_image_bytes(width=400, height=300)
        response = await async_client.post(
            "/uploads/filter-previews",
            files={"file": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        )
        assert response.status_code == 401
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_uploads.py::TestFilterPreviewEndpoint -v`
Expected: FAIL — endpoint doesn't exist

**Step 3: Add filter preview endpoint to uploads.py**

Add after the `upload_media` endpoint:

```python
PREVIEW_WIDTH = 200
PREVIEW_TEMP_DIR = "filter_previews"


@router.post("/uploads/filter-previews")
@requires_auth
async def filter_previews(request: Request, file: UploadFile = File(...)):
    """Generate small preview thumbnails for each available filter."""
    try:
        contents = await file.read()
        validate_image(file.content_type, len(contents))

        original_image = Image.open(io.BytesIO(contents))
        original_image = ImageOps.exif_transpose(original_image)

        # Resize to preview width for fast processing
        width, height = original_image.size
        preview_height = int(height * PREVIEW_WIDTH / width)
        preview_image = original_image.resize(
            (PREVIEW_WIDTH, preview_height), resample=Image.Resampling.LANCZOS
        )

        previews = {}
        bucket = None if LOCAL_STORAGE_PATH else get_gcs_bucket()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]

        # Clean up old previews (older than 10 minutes)
        _cleanup_old_previews()

        for filter_name in AVAILABLE_FILTERS:
            if filter_name == "none":
                continue
            filtered = apply_filter(preview_image, filter_name)
            output = io.BytesIO()
            filtered.save(output, format=OUTPUT_FORMAT.upper(), quality=80)
            output.seek(0)

            preview_filename = f"{PREVIEW_TEMP_DIR}/{timestamp}_{unique_id}_{filter_name}.{OUTPUT_FORMAT}"
            blob_path, _ = await upload_file(
                output.read(), preview_filename, f"image/{OUTPUT_FORMAT}", bucket
            )
            previews[filter_name] = f"/uploads/{preview_filename}"

        return {"previews": previews}

    except Exception as e:
        handle_error(e, "generating filter previews")


def _cleanup_old_previews():
    """Remove preview files older than 10 minutes."""
    if not LOCAL_STORAGE_PATH:
        return  # GCS cleanup handled separately if needed

    preview_dir = os.path.join(LOCAL_STORAGE_PATH, "uploads", PREVIEW_TEMP_DIR)
    if not os.path.exists(preview_dir):
        return

    cutoff = datetime.now().timestamp() - 600  # 10 minutes
    for filename in os.listdir(preview_dir):
        filepath = os.path.join(preview_dir, filename)
        if os.path.getmtime(filepath) < cutoff:
            os.remove(filepath)
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_uploads.py -v`
Expected: All PASS

Run full backend suite: `make test`
Expected: All PASS

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add backend/handlers/uploads.py backend/tests/test_uploads.py
git commit -m "feat: add filter preview endpoint"
```

---

### Task 4: Frontend — Client-Side Image Resize Utility

**Files:**
- Modify: `frontend/src/shared/utils/uploadUtils.ts` (add resizeImageFile function)
- Create: `frontend/src/shared/utils/uploadUtils.test.ts` (tests for resize)

**Step 1: Write the failing tests**

```typescript
// frontend/src/shared/utils/uploadUtils.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resizeImageFile, validateImageFile, MAX_IMAGE_SIZE } from './uploadUtils';

// Mock canvas and image for Node.js environment
class MockImage {
  width = 0;
  height = 0;
  src = '';
  onload: (() => void) | null = null;

  set _src(val: string) {
    this.src = val;
    // Simulate async load
    setTimeout(() => this.onload?.(), 0);
  }
}

describe('resizeImageFile', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL/revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('should return original file if dimensions are within limit', async () => {
    const smallFile = new File(['test'], 'small.jpg', { type: 'image/jpeg' });

    // Mock Image to return small dimensions
    const mockImg = new MockImage();
    mockImg.width = 1000;
    mockImg.height = 800;

    vi.stubGlobal('Image', vi.fn(() => {
      const img = mockImg;
      setTimeout(() => img.onload?.(), 0);
      return img;
    }));

    const result = await resizeImageFile(smallFile, 2048);
    expect(result).toBe(smallFile);
  });

  it('should skip resize for animated GIFs', async () => {
    const gifFile = new File(['test'], 'animation.gif', { type: 'image/gif' });
    const result = await resizeImageFile(gifFile, 2048);
    expect(result).toBe(gifFile);
  });

  it('should export function', () => {
    expect(typeof resizeImageFile).toBe('function');
  });
});

describe('validateImageFile', () => {
  it('should reject unsupported file types', () => {
    const file = new File(['test'], 'test.bmp', { type: 'image/bmp' });
    const result = validateImageFile(file);
    expect(result.isValid).toBe(false);
  });

  it('should reject files exceeding max size', () => {
    const largeContent = new Uint8Array(MAX_IMAGE_SIZE + 1);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.isValid).toBe(false);
  });

  it('should accept valid image files', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.isValid).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npx vitest run src/shared/utils/uploadUtils.test.ts`
Expected: FAIL — resizeImageFile not exported

**Step 3: Add resizeImageFile to uploadUtils.ts**

Add at the end of `frontend/src/shared/utils/uploadUtils.ts`:

```typescript
// Maximum dimension for client-side resize (longest side)
export const MAX_CLIENT_RESIZE_DIMENSION = 2048;

/**
 * Resize an image file client-side if it exceeds maxDimension.
 * Returns the original file if no resize needed or if the file is an animated GIF.
 * PNG with transparency exports as WebP to preserve alpha.
 */
export async function resizeImageFile(
  file: File,
  maxDimension: number = MAX_CLIENT_RESIZE_DIMENSION
): Promise<File | Blob> {
  // Skip animated GIFs — canvas flattens animation
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // No resize needed
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
      const scale = maxDimension / Math.max(width, height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Choose output format: WebP for PNG (preserves alpha), JPEG for JPEG sources
      const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
      const quality = file.type === 'image/jpeg' ? 0.92 : 0.90;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file); // Fallback
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resize'));
    };

    img.src = url;
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npx vitest run src/shared/utils/uploadUtils.test.ts`
Expected: All PASS

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add frontend/src/shared/utils/uploadUtils.ts frontend/src/shared/utils/uploadUtils.test.ts
git commit -m "feat: add client-side image resize utility"
```

---

### Task 5: Frontend — Filter Picker Component

**Files:**
- Create: `frontend/src/modules/editor/components/ImageFilterPicker.tsx`
- Create: `frontend/src/modules/editor/components/ImageFilterPicker.test.tsx`

**Step 1: Write the failing tests**

```typescript
// frontend/src/modules/editor/components/ImageFilterPicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageFilterPicker } from './ImageFilterPicker';

describe('ImageFilterPicker', () => {
  const mockPreviews = {
    auto_enhance: '/uploads/preview_auto_enhance.webp',
    warm: '/uploads/preview_warm.webp',
    cool: '/uploads/preview_cool.webp',
    high_contrast: '/uploads/preview_high_contrast.webp',
    bw: '/uploads/preview_bw.webp',
    vivid: '/uploads/preview_vivid.webp',
    vintage: '/uploads/preview_vintage.webp',
  };

  it('should render filter options when previews are loaded', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test-image"
        previews={mockPreviews}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('None')).toBeDefined();
    expect(screen.getByText('Auto Enhance')).toBeDefined();
    expect(screen.getByText('Warm')).toBeDefined();
  });

  it('should show loading state', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test-image"
        previews={{}}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-picker-loading')).toBeDefined();
  });

  it('should call onConfirm with selected filter', () => {
    const onConfirm = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test-image"
        previews={mockPreviews}
        loading={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Warm'));
    fireEvent.click(screen.getByTestId('filter-picker-apply'));

    expect(onConfirm).toHaveBeenCalledWith('warm');
  });

  it('should default to none filter', () => {
    const onConfirm = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test-image"
        previews={mockPreviews}
        loading={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('filter-picker-apply'));
    expect(onConfirm).toHaveBeenCalledWith('none');
  });

  it('should call onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test-image"
        previews={mockPreviews}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('filter-picker-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npx vitest run src/modules/editor/components/ImageFilterPicker.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the component**

```tsx
// frontend/src/modules/editor/components/ImageFilterPicker.tsx
import { useRef, useEffect, useState } from 'react';

const FILTER_LABELS: Record<string, string> = {
  none: 'None',
  auto_enhance: 'Auto Enhance',
  warm: 'Warm',
  cool: 'Cool',
  high_contrast: 'High Contrast',
  bw: 'B&W',
  vivid: 'Vivid',
  vintage: 'Vintage',
};

interface ImageFilterPickerProps {
  imageUrl: string;
  previews: Record<string, string>;
  loading: boolean;
  onConfirm: (filter: string) => void;
  onCancel: () => void;
}

export function ImageFilterPicker({
  imageUrl,
  previews,
  loading,
  onConfirm,
  onCancel,
}: ImageFilterPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFilter, setSelectedFilter] = useState('none');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg p-0 backdrop:bg-black/50"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-primary)',
        maxWidth: '40rem',
        width: '100%',
      }}
      onCancel={onCancel}
      data-testid="filter-picker-dialog"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Choose a Filter</h3>

        <div className="flex justify-center mb-4">
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              maxHeight: '300px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '0.5rem',
            }}
          />
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-8"
            data-testid="filter-picker-loading"
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Generating previews...
            </span>
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* None option with original image */}
            <button
              key="none"
              onClick={() => setSelectedFilter('none')}
              className="flex flex-col items-center flex-shrink-0"
              style={{
                border: selectedFilter === 'none'
                  ? '2px solid var(--color-accent-primary)'
                  : '2px solid transparent',
                borderRadius: '0.5rem',
                padding: '0.25rem',
              }}
              data-testid="filter-option-none"
            >
              <img
                src={imageUrl}
                alt="No filter"
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '0.375rem',
                }}
              />
              <span className="text-xs mt-1">None</span>
            </button>

            {Object.entries(FILTER_LABELS).map(([key, label]) => {
              if (key === 'none') return null;
              const previewUrl = previews[key];
              if (!previewUrl) return null;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key)}
                  className="flex flex-col items-center flex-shrink-0"
                  style={{
                    border: selectedFilter === key
                      ? '2px solid var(--color-accent-primary)'
                      : '2px solid transparent',
                    borderRadius: '0.5rem',
                    padding: '0.25rem',
                  }}
                  data-testid={`filter-option-${key}`}
                >
                  <img
                    src={previewUrl}
                    alt={label}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '0.375rem',
                    }}
                  />
                  <span className="text-xs mt-1">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary btn--sm"
            data-testid="filter-picker-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              onConfirm(selectedFilter);
            }}
            className="btn btn--primary btn--sm"
            data-testid="filter-picker-apply"
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npx vitest run src/modules/editor/components/ImageFilterPicker.test.tsx`
Expected: All PASS

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add frontend/src/modules/editor/components/ImageFilterPicker.tsx frontend/src/modules/editor/components/ImageFilterPicker.test.tsx
git commit -m "feat: add ImageFilterPicker component"
```

---

### Task 6: Frontend — Integrate Resize + Filter into Upload Flow

**Files:**
- Modify: `frontend/src/hooks/uploads/useImageUpload.ts`
- Modify: `frontend/src/hooks/uploads/useFileUpload.ts`
- Modify: `frontend/src/modules/editor/components/RichTextEditor.tsx`
- Modify: `frontend/src/pages/api/upload-proxy.ts`

**Step 1: Update useFileUpload to support FormData extras and resize**

Modify `frontend/src/hooks/uploads/useFileUpload.ts`:

Add to `UseFileUploadOptions`:
```typescript
export interface UseFileUploadOptions {
  validate: (file: File) => { isValid: boolean; error?: string };
  createValidationError: (file: File, error: string) => StandardErrorResponse;
  context: string;
  preprocess?: (file: File) => Promise<File | Blob>;
}
```

Update the `upload` function to accept optional extra form fields and run preprocess:
```typescript
const upload = useCallback(async (
  file: File,
  extraFields?: Record<string, string>
): Promise<UploadResponse | null> => {
    setError(null);

    // Validate file type first
    const validation = validate(file);
    if (!validation.isValid) {
      setError(createValidationError(file, validation.error!));
      return null;
    }

    setUploading(true);

    try {
      // Run preprocess (e.g., client-side resize)
      let processedFile: File | Blob = file;
      if (preprocess) {
        processedFile = await preprocess(file);
      }

      // Validate size after preprocessing
      const maxSize = getMaxSizeForType(file.type);
      if (processedFile.size > maxSize) {
        setError(createValidationError(file, `File too large after processing (${formatFileSize(processedFile.size)}). Maximum: ${formatFileSize(maxSize)}`));
        setUploading(false);
        return null;
      }

      const formData = new FormData();
      formData.append('files', processedFile, file.name);
      if (extraFields) {
        for (const [key, value] of Object.entries(extraFields)) {
          formData.append(key, value);
        }
      }

      // ... rest unchanged
```

Also update the imports in useFileUpload.ts to include `getMaxSizeForType` and `formatFileSize` from uploadUtils.

Update the `UseFileUploadReturn` type:
```typescript
upload: (file: File, extraFields?: Record<string, string>) => Promise<UploadResponse | null>;
```

**Step 2: Update useImageUpload with filter step**

Modify `frontend/src/hooks/uploads/useImageUpload.ts`:

```typescript
import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateImageFile, createFileValidationError, ALLOWED_IMAGE_TYPES, resizeImageFile } from '@/shared/utils/uploadUtils';
import { escapeHtmlAttr } from '@/shared/utils/htmlUtils';

export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
  pendingAltText: { resolve: (altText: string) => void } | null;
  pendingFilter: {
    imageUrl: string;
    previews: Record<string, string>;
    loading: boolean;
    resolve: (filter: string) => void;
  } | null;
}

export function useImageUpload(editor: Editor | null): UseImageUploadReturn {
  const baseUpload = useFileUpload({
    validate: (file) => {
      // Only validate type, not size (size checked after resize)
      const typeCheck = validateImageFile(file);
      if (!typeCheck.isValid && typeCheck.error?.includes('format')) {
        return typeCheck;
      }
      return { isValid: true };
    },
    createValidationError: (file, error) => createFileValidationError(file, error, 'image'),
    context: 'image',
    preprocess: resizeImageFile,
  });

  const [pendingAltText, setPendingAltText] = useState<{
    resolve: (altText: string) => void;
  } | null>(null);

  const [pendingFilter, setPendingFilter] = useState<{
    imageUrl: string;
    previews: Record<string, string>;
    loading: boolean;
    resolve: (filter: string) => void;
  } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];

    // Resize first
    const resized = await resizeImageFile(file);
    const imageUrl = URL.createObjectURL(resized);

    // Fetch filter previews
    let previews: Record<string, string> = {};
    const filterPromise = new Promise<string>((resolve) => {
      setPendingFilter({ imageUrl, previews: {}, loading: true, resolve });
    });

    // Fetch previews in background
    const previewFormData = new FormData();
    previewFormData.append('file', resized, file.name);
    try {
      const previewResponse = await fetch('/api/upload-proxy/filter-previews', {
        method: 'POST',
        body: previewFormData,
        credentials: 'include',
      });
      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        previews = previewData.previews || {};
      }
    } catch {
      // Previews failed — user can still pick "None"
    }

    setPendingFilter((prev) => prev ? { ...prev, previews, loading: false } : null);

    // Wait for user to pick a filter
    const selectedFilter = await filterPromise;
    setPendingFilter(null);
    URL.revokeObjectURL(imageUrl);

    if (selectedFilter === '__cancel__') {
      return;
    }

    const loadingText = `![Uploading ${file.name}...]()`;
    editor.commands.insertContent(loadingText);

    const result = await baseUpload.upload(file, { image_filter: selectedFilter });

    const content = editor.getHTML();
    const updatedContent = result
      ? content.replace(loadingText, '')
      : content.replace(/!\[Uploading .*?\]\(\)/g, '');
    editor.commands.setContent(updatedContent);

    if (result?.urls?.length) {
      const altText = await new Promise<string>((resolve) => {
        setPendingAltText({ resolve });
      });
      setPendingAltText(null);

      const { urls, srcsets, dimensions } = result;
      const safeAlt = escapeHtmlAttr(altText);
      const attrs = [`src="${urls[0]}"`, `alt="${safeAlt}"`];
      if (srcsets?.length) {
        attrs.push(`srcset="${srcsets[0]}"`, `sizes="(max-width: 400px) 400px, (max-width: 768px) 768px, (max-width: 1536px) 1536px, 2048px"`);
      }
      if (dimensions?.length) {
        attrs.push(`width="${dimensions[0].width}"`, `height="${dimensions[0].height}"`);
      }
      editor.commands.insertContent(`<img ${attrs.join(' ')} />`);
    }
  }, [editor, baseUpload]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
    pendingAltText,
    pendingFilter,
  };
}
```

**Step 3: Update RichTextEditor to render ImageFilterPicker**

In `frontend/src/modules/editor/components/RichTextEditor.tsx`, add after the AltTextDialog rendering:

```tsx
import { ImageFilterPicker } from './ImageFilterPicker';

// In the JSX, after AltTextDialog:
{imageUpload.pendingFilter && (
  <ImageFilterPicker
    imageUrl={imageUpload.pendingFilter.imageUrl}
    previews={imageUpload.pendingFilter.previews}
    loading={imageUpload.pendingFilter.loading}
    onConfirm={(filter) => imageUpload.pendingFilter?.resolve(filter)}
    onCancel={() => imageUpload.pendingFilter?.resolve('__cancel__')}
  />
)}
```

**Step 4: Add filter preview proxy route**

Create `frontend/src/pages/api/upload-proxy/filter-previews.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { apiLogger } from '@/shared/utils/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  apiLogger.logApiRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    const response = await fetch(`${backendUrl}/uploads/filter-previews`, {
      method: 'POST',
      headers: {
        ...req.headers as any,
        'Authorization': `Bearer ${session.accessToken}`,
      },
      // @ts-ignore
      body: req,
      duplex: 'half',
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    const e = error instanceof Error ? error : new Error(String(error));
    apiLogger.error('Filter preview proxy error', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
```

**Step 5: Run all tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make test && make test-frontend-unit`
Expected: All PASS

**Step 6: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add frontend/src/hooks/uploads/useFileUpload.ts frontend/src/hooks/uploads/useImageUpload.ts frontend/src/modules/editor/components/RichTextEditor.tsx frontend/src/pages/api/upload-proxy/filter-previews.ts
git commit -m "feat: integrate resize and filter picker into upload flow"
```

---

### Task 7: Frontend — medium-zoom Integration

**Files:**
- Create: `frontend/src/hooks/useImageZoom.ts`
- Create: `frontend/src/hooks/useImageZoom.test.ts`
- Modify: `frontend/src/pages/_app.tsx`
- Modify: `frontend/src/modules/stories/components/StoryCard.tsx`
- Modify: `frontend/package.json` (add medium-zoom)

**Step 1: Install medium-zoom**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npm install medium-zoom
```

**Step 2: Write the failing test**

```typescript
// frontend/src/hooks/useImageZoom.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImageZoom } from './useImageZoom';

// Mock medium-zoom
vi.mock('medium-zoom', () => ({
  default: vi.fn(() => ({
    attach: vi.fn(),
    detach: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

describe('useImageZoom', () => {
  it('should export useImageZoom hook', () => {
    expect(typeof useImageZoom).toBe('function');
  });

  it('should handle null ref gracefully', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useImageZoom(ref));
    expect(result).toBeDefined();
  });
});
```

**Step 3: Create the hook**

```typescript
// frontend/src/hooks/useImageZoom.ts
import { useEffect, RefObject } from 'react';
import mediumZoom, { Zoom } from 'medium-zoom';

export function useImageZoom(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const images = container.querySelectorAll('img:not([data-zoom-disabled])');
    if (images.length === 0) return;

    const zoom: Zoom = mediumZoom(images as unknown as HTMLElement[], {
      margin: 24,
      background: 'var(--color-bg-overlay, rgba(0, 0, 0, 0.85))',
    });

    // Enhanced zoom: wheel + pinch support
    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let zoomedImage: HTMLElement | null = null;

    const applyTransform = () => {
      if (zoomedImage) {
        zoomedImage.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!zoomedImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      currentScale = Math.min(3, Math.max(1, currentScale + delta));
      applyTransform();
    };

    let lastTouchDistance = 0;

    const handleTouchMove = (e: TouchEvent) => {
      if (!zoomedImage || e.touches.length < 2) return;
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance > 0) {
        const delta = (distance - lastTouchDistance) * 0.005;
        currentScale = Math.min(3, Math.max(1, currentScale + delta));
        applyTransform();
      }
      lastTouchDistance = distance;
    };

    const handleTouchEnd = () => {
      lastTouchDistance = 0;
    };

    // Drag to pan when zoomed
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (!zoomedImage || currentScale <= 1) return;
      isDragging = true;
      dragStartX = e.clientX - translateX;
      dragStartY = e.clientY - translateY;
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !zoomedImage) return;
      translateX = e.clientX - dragStartX;
      translateY = e.clientY - dragStartY;
      applyTransform();
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    zoom.on('open', () => {
      const overlay = document.querySelector('.medium-zoom-image--opened') as HTMLElement;
      zoomedImage = overlay;
      currentScale = 1;
      translateX = 0;
      translateY = 0;

      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    zoom.on('close', () => {
      zoomedImage = null;
      currentScale = 1;
      translateX = 0;
      translateY = 0;

      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });

    return () => {
      zoom.detach();
    };
  }, [containerRef, enabled]);
}
```

**Step 4: Integrate in _app.tsx**

In `frontend/src/pages/_app.tsx`, add a ref on the main content wrapper and attach the hook:

```tsx
import { useRef } from 'react';
import { useImageZoom } from '@/hooks/useImageZoom';

// Inside the App component, before the return:
const mainRef = useRef<HTMLDivElement>(null);
useImageZoom(mainRef);

// Wrap the Component render in a div with the ref:
<div ref={mainRef}>
  <Component {...pageProps} />
</div>
```

**Step 5: Update StoryCard to decouple image clicks**

In `frontend/src/modules/stories/components/StoryCard.tsx`, the content link at line 165 wraps both the media preview and "Read full story" in a single `<Link>`. Split them so images are not inside the link:

Replace the published story section (lines 163-189):
```tsx
{!isDraft ? (
    <>
        <StoryMediaPreview leadImage={leadImage} rest={rest} />
        <div className="mt-4">
            <Link href={storyPath} data-testid={`story-content-link-${story.id}`}>
                <span className="btn btn--secondary btn--sm" data-testid={`story-read-more-${story.id}`}>
                    Read full story →
                </span>
            </Link>
        </div>
        {engagementCounts && (
            <div className="mt-4 flex items-center justify-end gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {Object.entries(engagementCounts.reactions).length > 0 && (
                    <span className="flex items-center gap-3">
                        {Object.entries(engagementCounts.reactions).map(([tag, count]) => (
                            <span key={tag} className="flex items-center gap-1">
                                {REACTION_ICONS[tag]} {count}
                            </span>
                        ))}
                    </span>
                )}
                {engagementCounts.comment_count > 0 && (
                    <span>💬 {engagementCounts.comment_count}</span>
                )}
            </div>
        )}
    </>
) : (
    <StoryMediaPreview leadImage={leadImage} rest={rest} />
)}
```

**Step 6: Run all tests**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make test && make test-frontend-unit
```
Expected: All PASS. StoryCard tests may need updating if they assert on the Link wrapping content.

**Step 7: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add frontend/package.json frontend/package-lock.json frontend/src/hooks/useImageZoom.ts frontend/src/hooks/useImageZoom.test.ts frontend/src/pages/_app.tsx frontend/src/modules/stories/components/StoryCard.tsx
git commit -m "feat: add global medium-zoom image viewer with enhanced zoom"
```

---

### Task 8: Update StoryCard Tests

**Files:**
- Modify: `frontend/src/modules/stories/components/StoryCard.test.ts`

**Step 1: Read existing StoryCard tests**

Read `frontend/src/modules/stories/components/StoryCard.test.ts` to understand what needs updating after the Link restructuring in Task 7.

**Step 2: Update tests**

Any tests asserting that clicking the content/image area navigates to the story detail should be updated. The `story-content-link` test ID now wraps only the "Read full story" button, not the media preview.

**Step 3: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement/frontend && npx vitest run src/modules/stories/components/StoryCard.test.ts`
Expected: All PASS

**Step 4: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format
git add frontend/src/modules/stories/components/StoryCard.test.ts
git commit -m "test: update StoryCard tests for decoupled image clicks"
```

---

### Task 9: Manual Integration Test

**Step 1: Start the dev environment**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make dev-local
```

**Step 2: Test client-side resize**

- Upload a large image (>5MB, >2048px) — should succeed without size error
- Verify network tab shows a smaller file being uploaded

**Step 3: Test filter picker**

- Upload an image — filter picker dialog should appear
- Preview thumbnails should load for each filter
- Selecting a filter and clicking Apply should upload with the filter applied
- Cancel should abort without uploading

**Step 4: Test responsive variants**

- Inspect an uploaded image in the editor HTML — srcset should show 400/768/1536/2048 widths
- Check local uploads directory for the variant files

**Step 5: Test medium-zoom**

- Click an image in the feed — should expand in place, not navigate
- Click "Read full story" — should navigate to detail view
- Click an image in the detail view — should expand
- Scroll or press Escape while zoomed — should dismiss
- Mouse wheel while zoomed — should zoom in/out

**Step 6: Stop dev environment**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make down
```

---

### Task 10: Final Formatting and Full Test Run

**Step 1: Run all formatters and tests**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && make format && make test && make test-frontend-unit
```
Expected: All pass, no formatting issues

**Step 2: Final commit if any formatting changes**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/image-enhancement && git add -A && git status
# Only commit if there are changes
git commit -m "chore: final formatting pass"
```
