# Image Enhancement: Resize, Filters, and Zoom

## Overview

Three features that improve the image upload and viewing experience:

1. **Client-side resize** — Downscale large images before upload to prevent 5MB rejections
2. **Server-side image filters** — Pillow-based named filters applied during upload processing
3. **Zoom-in-place image viewer** — `medium-zoom` on all content images site-wide

## Feature 1: Client-Side Image Resize

### Problem

Camera photos are typically 8-15MB. The current 5MB upload limit rejects them outright. Users must manually resize before uploading.

### Solution

New utility `resizeImageFile(file: File, maxDimension: number): Promise<Blob>` in `uploadUtils.ts`.

- Loads file into `Image` element via `URL.createObjectURL`
- If both dimensions already <= 2048px, returns original file unchanged
- Calculates scaled dimensions preserving aspect ratio, longest side capped at 2048px
- Exports via `canvas.toBlob()` — JPEG at 0.92 quality for JPEG sources, WebP at 0.90 for others
- PNG with transparency exports as WebP (preserves alpha)
- Animated GIFs skip resize entirely (canvas flattens animation), gated by existing 5MB limit

### Integration

In `useFileUpload.ts`, resize runs after MIME type validation and before file size validation:

1. Validate MIME type
2. Resize (if needed)
3. Validate file size (against resized blob)
4. Upload

### Why 2048px

Industry reference points: Facebook caps at 2048px, WordPress at 2560px, Instagram at 1080px. 2048px provides clean headroom above the largest backend variant (2048px) without wasting bandwidth. Matches the largest responsive variant — the client-side resize effectively becomes a "don't upload more than we'll ever serve" gate.

## Feature 2: Server-Side Image Filters

### Approach

All filter processing happens in Pillow during the existing upload pipeline. No client-side filter rendering, no live preview. User selects a named filter from thumbnail previews, the backend applies it.

### Filters

| Filter | Pillow Operations |
|---|---|
| None | No processing |
| Auto Enhance | `Contrast(1.15)` + `Sharpness(1.2)` + `Color(1.1)` |
| Warm | `Color(1.15)` + channel curve: red +10, green +5, blue -10 |
| Cool | Channel curve: red -10, blue +15 + `Contrast(1.1)` |
| High Contrast | `Contrast(1.4)` + `Sharpness(1.15)` |
| B&W | `ImageOps.grayscale()` + `Contrast(1.2)` |
| Vivid | `Color(1.5)` + `Contrast(1.15)` + `Brightness(1.05)` |

Per-channel curves use `Image.split()` + `point()` lambda + `Image.merge()`.

### Upload Pipeline Order

1. Receive file
2. EXIF transpose (existing)
3. Apply selected filter (new)
4. Generate responsive variants (modified sizes)
5. Convert to WebP (existing)

### API Changes

**Modified endpoint:** `POST /uploads`
- New optional form field: `image_filter` (string)
- Valid values: `none`, `auto_enhance`, `warm`, `cool`, `high_contrast`, `bw`, `vivid`
- Default: `none`. Invalid values treated as `none`.

**New endpoint:** `POST /uploads/filter-previews`
- Accepts an image file
- Returns JSON with URLs to 200px-wide preview thumbnails for each filter
- Thumbnails are temporary, cleaned up after 10 minutes
- Cleanup runs lazily on the next preview request (no background worker)

### Filter Selection UI

New component `ImageFilterPicker.tsx` — modal dialog between file selection and alt text dialog.

**Layout:**
- Top: preview of the selected image
- Middle: horizontal scrollable row of filter thumbnail cards (200px preview + filter name)
- Selected card highlighted with border
- Bottom: Cancel and Apply buttons

**Flow:**
1. User selects file
2. Client-side resize runs
3. Resized file sent to `/uploads/filter-previews`
4. Loading state while previews generate
5. Thumbnails populate the filter picker
6. User selects a filter (or leaves on None)
7. User hits Apply
8. File uploads to `/uploads` with `image_filter` parameter
9. Alt text dialog appears
10. Image inserts into editor

Cancel aborts entirely — no upload, editor unchanged.

## Feature 3: Responsive Variant Changes

### Current Sizes

500, 750, 1200px — based on arbitrary breakpoints, not matched to actual layout.

### New Sizes

| Variant | Width | Purpose |
|---|---|---|
| small | 400px | Mobile (1x) |
| medium | 768px | Content width (1x), matches max rendered size |
| large | 1536px | Retina (2x at 768px content width) |
| full | 2048px | Zoom viewer, high-quality display |

### Layout Context

- Feed card content area: 720px max
- Detail view content area: 768px max
- Current 1200px variant is oversized for 1x display, undersized for 2x retina

### srcset/sizes Update

```html
srcset="img_400.webp 400w, img_768.webp 768w, img_1536.webp 1536w, img.webp 2048w"
sizes="(max-width: 400px) 400px, (max-width: 768px) 768px, (max-width: 1536px) 1536px, 2048px"
```

### Backward Compatibility

Existing images have old srcset strings baked into stored HTML content. Old variants (500/750/1200) remain on disk/GCS. No migration needed — old images continue working. Only new uploads get new variants.

## Feature 4: Zoom-in-Place Image Viewer

### Library

`medium-zoom` (~4KB, zero dependencies). Handles expand-from-position animation, dimmed background overlay, dismiss on click/scroll/Escape.

### Scope

All content images site-wide are zoomable. Not limited to detail view.

### Interaction Changes

- **Image click anywhere** (feed cards, detail view, projects, static pages) → `medium-zoom` expands the image
- **Story card navigation** → only via title or "Read Full Story" link (not image click)
- `StoryCard.tsx` updated so images do not trigger card navigation (stop propagation or restructure link nesting)

### Integration

Global hook `useImageZoom(containerRef)` attaches `medium-zoom` to all `img` elements within a container. Attached at `Layout.tsx` or `_app.tsx` level.

```js
const zoom = mediumZoom(containerRef.current?.querySelectorAll('img'), {
  margin: 24,
  background: 'var(--color-bg-overlay)',
})
```

### Enhanced Zoom (Beyond medium-zoom Default)

Custom handler on `medium-zoom` `opened` event (~60-80 lines):
- Mouse wheel → scale transform 1x to 3x
- Touch pinch → same scale via touch distance calculation
- When zoomed beyond 1x, drag to pan
- Click without drag dismisses

### Accessibility

`medium-zoom` adds `role="button"` and `tabindex="0"` to zoomable images. Escape dismisses. Keyboard focusable.

## File Changes

### New Files

| File | Purpose |
|---|---|
| `frontend/src/modules/editor/components/ImageFilterPicker.tsx` | Filter selection modal |
| `frontend/src/modules/editor/components/ImageFilterPicker.test.tsx` | Tests |
| `frontend/src/hooks/uploads/useImageZoom.ts` | medium-zoom hook |
| `frontend/src/hooks/uploads/useImageZoom.test.ts` | Tests |
| `backend/handlers/image_filters.py` | Pillow filter functions + preview endpoint |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/shared/utils/uploadUtils.ts` | Add `resizeImageFile()` |
| `frontend/src/hooks/uploads/useFileUpload.ts` | Integrate resize before upload |
| `frontend/src/hooks/uploads/useImageUpload.ts` | Add filter selection step, send `image_filter` param |
| `frontend/src/pages/_app.tsx` or `frontend/src/layout/Layout.tsx` | Attach `useImageZoom` globally |
| `frontend/src/modules/stories/components/StoryCard.tsx` | Decouple image click from card navigation |
| `backend/handlers/uploads.py` | Accept `image_filter` param, call filter functions, update `IMAGE_SIZES` |
| `backend/models/upload.py` | Add filter name constants/validation |
| `frontend/package.json` | Add `medium-zoom` dependency |

### No Changes To

- Database schema
- Authentication flow
- Existing uploaded images
- API route structure (except new preview endpoint)
