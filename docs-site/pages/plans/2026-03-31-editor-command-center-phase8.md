# Editor Command Center — Phase 8: Assets Tab Rebuild

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current assets tab (HTML parsing, loads everything at once) with a storage-reflective view that shows assets as they exist in the bucket, grouped by logical asset with all variants visible.

**Architecture:** New backend endpoint lists files from GCS/local storage by prefix. Frontend displays assets grouped by asset ID, each expandable to show all size variants (originals, large, medium, thumbnails for images; originals, processed, thumbnails for video). Content association derived by matching asset URLs in section content. Paginated to handle large sections.

**Tech Stack:** FastAPI (backend endpoint), GCS client / filesystem listing, React, shadcn/ui (command center), virtual scrolling or pagination

---

### Task 1: Backend — storage listing endpoint

**Files:**
- Create: `backend/handlers/asset_listing.py`
- Modify: `backend/app.py` (register route)

Create `GET /assets/list` endpoint that lists files from storage (GCS in production, local filesystem in dev).

**Step 1: Design the endpoint**

```
GET /assets/list?prefix=images&limit=50&cursor={opaque_cursor}
```

Parameters:
- `prefix` — storage path prefix (e.g., `images/originals`, `video/originals`). Default: list all.
- `limit` — max items per page. Default: 50.
- `cursor` — opaque pagination cursor (GCS page token or filesystem offset).

Response:
```json
{
  "items": [
    {
      "asset_id": "20260329_143022_a7f3b2",
      "type": "image",
      "variants": [
        { "variant": "originals", "path": "images/originals/20260329_143022_a7f3b2.webp", "size_bytes": 245000 },
        { "variant": "large", "path": "images/large/20260329_143022_a7f3b2.webp", "size_bytes": 180000 },
        { "variant": "medium", "path": "images/medium/20260329_143022_a7f3b2.webp", "size_bytes": 95000 },
        { "variant": "thumbnails", "path": "images/thumbnails/20260329_143022_a7f3b2.webp", "size_bytes": 32000 }
      ],
      "total_size_bytes": 552000,
      "created_date": "2026-03-29T14:30:22Z"
    }
  ],
  "next_cursor": "...",
  "total_count": null
}
```

**Step 2: Implement GCS listing**

For GCS: use `storage.Client().bucket(bucket_name).list_blobs(prefix=prefix)`. Group by asset ID (extract from filename pattern `{YYYYMMDD}_{HHMMSS}_{uuid8}`). Each blob has `.name`, `.size`, `.time_created`.

For local filesystem: use `os.scandir()` on `LOCAL_STORAGE_PATH/uploads/{prefix}`. Group the same way.

**Step 3: Group variants by asset ID**

The asset ID is the filename stem without extension: `20260329_143022_a7f3b2`. List the `originals/` directory to get the primary assets, then for each asset ID, check which variants exist in `large/`, `medium/`, `thumbnails/`.

For efficiency, list all blobs under `images/` in one call, then group in Python.

**Step 4: Register route and add auth**

```python
@router.get("/assets/list")
@requires_auth
async def list_assets(prefix: str = "", limit: int = 50, cursor: str = None):
```

**Step 5: Write tests**

Test with local filesystem storage (no GCS dependency in tests). Create temp files matching the naming pattern, verify grouping and pagination.

**Step 6: Commit**

```bash
git add backend/handlers/asset_listing.py backend/app.py backend/tests/test_asset_listing.py
git commit -m "feat: add storage listing endpoint for assets"
```

---

### Task 2: Backend — content association endpoint

**Files:**
- Modify: `backend/handlers/asset_listing.py`

Add an endpoint that, given a section ID, returns all asset IDs referenced in that section's content.

```
GET /assets/by-section/{section_id}
```

**Step 1: Implement content scanning**

For each content type:
- **Stories**: query stories by `section_id`, extract URLs from `content` HTML using regex (same pattern as current `extractAssetsFromHtml`)
- **Photo essays**: query photo essays by `section_id`, collect `cover_image_url` and `photos[].url`
- **Projects**: query projects by `section_id`, extract from `content` HTML and `image_url`

**Step 2: Extract asset IDs from URLs**

Parse the URL path to extract the asset ID. The URL format is `/uploads/images/originals/{asset_id}.webp`. Extract `{asset_id}` from each URL.

**Step 3: Return asset listing filtered to section**

Combine: for each extracted asset ID, fetch its variants from storage (reuse the grouping logic from Task 1). Return the same response format as Task 1 but filtered to only assets referenced by the section's content.

Include a `referenced_by` field on each asset:
```json
{
  "asset_id": "20260329_143022_a7f3b2",
  "referenced_by": [
    { "content_type": "story", "title": "My Post", "id": "abc123" }
  ],
  "variants": [...]
}
```

**Step 4: Write tests**

**Step 5: Commit**

```bash
git add backend/handlers/asset_listing.py backend/tests/test_asset_listing.py
git commit -m "feat: add section-scoped asset listing with content association"
```

---

### Task 3: Frontend — API client for asset listing

**Files:**
- Modify: `frontend/src/shared/lib/api-client.ts`
- Modify: `frontend/src/shared/types/api.ts`

**Step 1: Add TypeScript types**

```typescript
interface AssetVariant {
  variant: string;
  path: string;
  size_bytes: number;
}

interface AssetGroup {
  asset_id: string;
  type: "image" | "video";
  variants: AssetVariant[];
  total_size_bytes: number;
  created_date: string;
  referenced_by?: { content_type: string; title: string; id: string }[];
}

interface AssetListResponse {
  items: AssetGroup[];
  next_cursor: string | null;
}
```

**Step 2: Add API client methods**

```typescript
assets: {
  listBySection: (sectionId: string, token: string, cursor?: string) =>
    fetchJson<AssetListResponse>(`/assets/by-section/${sectionId}?limit=30${cursor ? `&cursor=${cursor}` : ''}`),
  listAll: (prefix: string, token: string, cursor?: string) =>
    fetchJson<AssetListResponse>(`/assets/list?prefix=${prefix}&limit=30${cursor ? `&cursor=${cursor}` : ''}`),
}
```

**Step 3: Commit**

```bash
git add frontend/src/shared/lib/api-client.ts frontend/src/shared/types/api.ts
git commit -m "feat: add asset listing API client and types"
```

---

### Task 4: Frontend — replace AssetsGrid with AssetBrowser

**Files:**
- Create: `frontend/src/modules/admin/components/AssetBrowser.tsx`
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`
- Delete or deprecate: `frontend/src/modules/admin/components/AssetsGrid.tsx`
- Delete or deprecate: `frontend/src/modules/admin/hooks/useSectionAssets.ts`

**Step 1: Create AssetBrowser component**

A table-based asset browser for the command center:

```
| Preview | Asset ID | Type | Variants | Total Size | Referenced By |
|---------|----------|------|----------|------------|---------------|
| [thumb] | 20260329_143022_a7f3b2 | image | 4 files | 552 KB | "My Post" |
```

Each row is expandable. Clicking expands to show all variants:

```
  originals/  20260329_143022_a7f3b2.webp  245 KB  [preview] [copy URL]
  large/      20260329_143022_a7f3b2.webp  180 KB  [preview] [copy URL]
  medium/     20260329_143022_a7f3b2.webp   95 KB  [preview] [copy URL]
  thumbnails/ 20260329_143022_a7f3b2.webp   32 KB  [preview] [copy URL]
```

Features:
- Paginated with "Load more" button (uses cursor from API)
- Thumbnail preview using the `thumbnails/` variant URL
- Total size per asset (sum of all variants)
- "Copy URL" button for each variant (copies the full URL to clipboard)
- Sort by date (default), size, or name
- Filter by type (image/video/all)

**Step 2: Create useSectionAssetBrowser hook**

New hook that calls the `assets.listBySection` API method. Manages:
- `items: AssetGroup[]` — accumulated across pages
- `loading: boolean`
- `error: string | null`
- `hasMore: boolean`
- `loadMore: () => void` — fetches next page using cursor

**Step 3: Wire into AdminDetailPanel**

Replace the `AssetsGrid` usage in AdminDetailPanel with `AssetBrowser`. Pass `sectionId` and the session token.

**Step 4: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 5: Commit**

```bash
git add frontend/src/modules/admin/components/AssetBrowser.tsx frontend/src/modules/admin/components/AdminDetailPanel.tsx frontend/src/modules/admin/hooks/
git commit -m "feat: replace AssetsGrid with storage-reflective AssetBrowser"
```

---

### Task 5: Clean up old assets code

**Files:**
- Delete: `frontend/src/modules/admin/components/AssetsGrid.tsx`
- Delete: `frontend/src/modules/admin/hooks/useSectionAssets.ts`

Remove the old HTML-parsing approach. Verify no other files import these.

**Step 1: Search for references**

```bash
grep -r "AssetsGrid\|useSectionAssets" frontend/src/
```

**Step 2: Remove files and fix imports**

**Step 3: Run type check and tests**

```bash
cd frontend && npx tsc --noEmit && npm run lint
make test-frontend-unit
make test
```

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove old HTML-parsing assets code"
```

---

### Task 6: Format, test, QA

**Step 1: Run formatting and tests**

```bash
make format
make test-frontend-unit
make test
```

**Step 2: Start dev environment and QA**

```bash
make dev-local
```

Verify:
- Assets tab shows grouped assets for a section with content
- Each asset row shows thumbnail, ID, type, variant count, total size
- Expanding a row shows all variants with individual sizes
- "Copy URL" copies the correct URL
- Pagination works (if section has many assets)
- Empty sections show appropriate empty state
- Video assets show with their processed variants and thumbnails

**Step 3: Commit any fixes**

---

### Task 7: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase8
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: storage-reflective assets tab (Phase 8)" \
  --body "$(cat <<'EOF'
## Summary
- New backend endpoint listing files from GCS/local storage grouped by asset ID
- Section-scoped asset listing with content association (which content references each asset)
- Asset browser component replacing HTML-parsing approach
- Each asset expandable to show all variants (originals, large, medium, thumbnails)
- Paginated loading, copy URL, size display
- Removed old AssetsGrid and useSectionAssets

## Test plan
- [ ] Assets tab shows grouped assets per section
- [ ] Expanding asset row shows all size variants
- [ ] Copy URL works for each variant
- [ ] Pagination loads more assets on demand
- [ ] Video assets show processed formats and thumbnails
- [ ] Empty sections show empty state
- [ ] Works with local storage (dev) and GCS (prod)
EOF
)"
```
