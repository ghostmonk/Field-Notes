# Asset Storage

## Problem

The current asset organization (migration 0014) places images under `uploads/photos/{section_id}/`. This breaks when content moves between sections — the asset paths become stale, requiring either asset moves (expensive, breaks caches) or redirect logic for static files (complex, cache-hostile).

Assets must be location-independent. A photo uploaded to a story should not change URLs when that story moves from `/blog/` to `/archive/personal/`.

## Design: ID-Anchored, Type-Organized

Assets are organized by **media type** and identified by a **unique asset ID**. The section or content item an asset belongs to is irrelevant to its storage path.

### Directory Structure

```
uploads/
├── images/
│   ├── originals/          # full-size original uploads
│   │   ├── {asset_id}.webp
│   │   └── ...
│   ├── thumbnails/         # small preview size
│   │   ├── {asset_id}.webp
│   │   └── ...
│   ├── medium/             # medium responsive breakpoint
│   │   ├── {asset_id}.webp
│   │   └── ...
│   └── large/              # large responsive breakpoint
│       ├── {asset_id}.webp
│       └── ...
├── video/
│   ├── originals/          # raw uploaded video files
│   │   ├── {asset_id}.mov
│   │   └── ...
│   ├── processed/          # transcoded H.264 for playback
│   │   ├── {asset_id}.mp4
│   │   └── ...
│   └── thumbnails/         # poster frame / preview image
│       ├── {asset_id}.jpg
│       └── ...
└── audio/                  # future: podcast audio files
    ├── originals/
    │   ├── {asset_id}.mp3
    │   └── ...
    └── processed/
        └── ...
```

### Asset ID Format

Each uploaded file gets a unique ID at upload time. The ID is a combination of timestamp and random suffix to ensure uniqueness and rough chronological ordering:

```
{YYYYMMDD}_{HHmmss}_{random6}
```

Example: `20260329_143022_a7f3b2`

This is the current naming scheme (`ProcessedMediaFile.primary_url` already uses this format). The change is only in directory organization, not in file naming.

### URL Format

```
/uploads/images/originals/20260329_143022_a7f3b2.webp
/uploads/images/thumbnails/20260329_143022_a7f3b2.webp
/uploads/images/medium/20260329_143022_a7f3b2.webp
/uploads/images/large/20260329_143022_a7f3b2.webp
/uploads/video/processed/20260329_143022_a7f3b2.mp4
/uploads/video/thumbnails/20260329_143022_a7f3b2.jpg
```

### srcset Generation

The responsive `srcset` attribute points to the size variants:

```html
<img
  src="/uploads/images/originals/20260329_143022_a7f3b2.webp"
  srcset="
    /uploads/images/thumbnails/20260329_143022_a7f3b2.webp 400w,
    /uploads/images/medium/20260329_143022_a7f3b2.webp 768w,
    /uploads/images/large/20260329_143022_a7f3b2.webp 1536w,
    /uploads/images/originals/20260329_143022_a7f3b2.webp 2048w
  "
/>
```

## Why Not Section-Based Paths

| Concern | Section-based (`/photos/{section_id}/`) | ID-based (`/images/originals/{id}`) |
|---------|----------------------------------------|-------------------------------------|
| Content moves | Asset URLs break or need migration | No change needed |
| Cache invalidation | Must bust cache on move | Never invalidated by content changes |
| CDN compatibility | Path changes invalidate CDN edge cache | Stable URLs, CDN caches indefinitely |
| GCS organization | Files scattered across section prefixes | Files grouped by processing stage |
| Cleanup/orphan detection | Must cross-reference sections | Can scan for unreferenced IDs across all content |

## Asset Metadata (Optional Future)

If asset management becomes more complex (tagging, searching, reuse across content items), an `assets` collection can track metadata:

```typescript
interface Asset {
  id: string;           // the asset_id
  media_type: "image" | "video" | "audio";
  original_filename: string;
  mime_type: string;
  dimensions: { width: number; height: number } | null;
  file_size: number;
  variants: string[];   // ["thumbnails", "medium", "large"]
  uploaded_by: string;
  uploaded_at: string;
}
```

This is not required for the initial implementation. The current system stores URLs directly in content HTML and that continues to work. The metadata collection becomes useful when assets need to be browsable, searchable, or reusable independent of the content they appear in.

## Migration from Current Structure

Migration 0014 placed images under `uploads/photos/{section_id}/`. A new migration will:

1. Scan all files under `uploads/photos/` and `uploads/video/`
2. Move each file to the new type-based directory structure
3. Rewrite URLs in all content collections (stories, projects, pages, photo essays)
4. Rewrite srcset attributes to point to new paths
5. Handle both local filesystem and GCS bucket

This migration must run before content moves are enabled, since moved content would leave orphaned assets in old section directories.

## Size Variants

| Variant | Directory | Max Width | Use Case |
|---------|-----------|-----------|----------|
| thumbnail | `images/thumbnails/` | 400px | List cards, previews |
| medium | `images/medium/` | 768px | Mobile full-width |
| large | `images/large/` | 1536px | Desktop content area |
| original | `images/originals/` | As uploaded | Full-size / download |

Variants are generated at upload time by the existing image processing pipeline. The only change is the output directory structure.

Video variants follow the same pattern: original upload preserved, processed transcode for playback, thumbnail poster frame for preview.

## Future: Admin Asset Browser

Storage is flat by ID, but administrators need to see assets organized by where they're used. A future admin view will reconstruct the section hierarchy for assets by tracing references:

```
asset_id → referenced in content HTML → content.section_id → section tree
```

This is a read-time view, not a storage concern. The same asset could appear in multiple content items across different sections. The browser would show:

- Assets grouped by section path (e.g., "creative-work / photography" shows all assets used in that section's content)
- Orphaned assets — uploaded but not referenced in any content (candidates for cleanup)
- Asset reuse — assets referenced by multiple content items

This requires the `assets` metadata collection described above, populated either retroactively by scanning content HTML or incrementally at upload time. Implementation is deferred to a later PR.
