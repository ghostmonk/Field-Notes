# Migration Plan

Migration from the current flat routing system to nested routing. Each phase is independently deployable. The existing site continues to work at every intermediate step.

---

## Phase 0: Asset Storage Reorganization

**Goal:** Move assets from section-based paths (`uploads/photos/{section_id}/`) to type-based paths (`uploads/images/originals/{asset_id}`). Must complete before content moves are enabled.

### Tasks

1. Write migration to scan all files under `uploads/photos/` and `uploads/video/`
2. Move each file to the new directory structure (see [Asset Storage](./asset-storage))
3. Rewrite all asset URLs in content collections (stories, projects, pages, photo essays)
4. Rewrite srcset attributes to point to new variant directories
5. Update the upload handler to write new files to the type-based structure
6. Update the image processing pipeline output directories
7. Update the video processing pipeline output directories
8. Handle both local filesystem (`LOCAL_STORAGE_PATH`) and GCS bucket
9. Update the Next.js static file proxy if it has path assumptions

### Tests

- All existing content renders images and videos correctly after migration
- New uploads go to the correct type-based directories
- srcset attributes point to valid, accessible URLs
- Both local dev and GCS production paths work

---

## Phase 1: Data Model Migration

**Goal:** Update the section model, add the `path` field, create the redirects collection, update indexes.

### Tasks

1. Add `path` field to section model (computed from `parent_id` chain)
2. Write migration to populate `path` on all existing sections (top-level sections get `path = slug`)
3. Remove `content_type` from section model
4. Change slug uniqueness index from global `slug` to compound `(parent_id, slug)`
5. Create `redirects` collection with `old_path` unique index
6. Add `content_type` field to each content collection if not already present (stories get `"story"`, projects get `"project"`, etc.)
7. Add compound `(section_id, slug)` uniqueness index on each content collection

### Backward Compatibility

- Existing sections are all top-level (`parent_id: null`), so `path = slug` for all of them
- Removing `content_type` from sections means the frontend must stop relying on it — handled in Phase 3
- The new indexes are additive; old queries still work

### Tests

- Migration populates `path` correctly for all existing sections
- New uniqueness constraints don't conflict with existing data
- Redirects collection is empty and queryable

---

## Phase 2: Path Resolution Endpoint

**Goal:** Build `GET /sections/resolve-path/{full_path}` on the backend.

### Tasks

1. Implement `resolve_path` handler with the algorithm from the [Path Resolution](./path-resolution) doc
2. Implement `find_content_in_section` helper that searches across all content collections
3. Implement breadcrumb builder (walk ancestors from resolved section to root)
4. Implement redirect lookup as fallback when path doesn't resolve
5. Add auth-aware handling: authenticated requests can resolve unpublished sections/content

### Tests

- Full test suite from [Testing Strategy](./testing-strategy): path resolution section
- Benchmark: resolution of a 5-deep path completes in under 50ms

---

## Phase 3: Children Endpoint

**Goal:** Build `GET /sections/{id}/children` that returns mixed content types as `ListingItem`.

### Tasks

1. Define `ListingItem` projection for each content collection
2. Implement the children endpoint: query child sections + content items, merge and paginate
3. Implement `subtree=true` mode: collect descendant section IDs, query content across all of them
4. Implement `featured_only=true` filter
5. Ensure computed listing fields (summary from HTML content, image_url from content body) are stored on write, not computed on read

### Tests

- Full test suite from [Testing Strategy](./testing-strategy): children endpoint section
- Mixed content types in response conform to ListingItem shape
- Subtree queries return correct scoped results

---

## Phase 4: Move & Redirect Operations

**Goal:** Build the move endpoints and redirect write logic.

### Tasks

1. Implement `PUT /content/{content_type}/{content_id}/move` — move content between sections
2. Implement `PUT /sections/{section_id}/move` — move section to new parent
3. Implement cycle detection for section moves
4. Implement slug collision checking for both content and section moves
5. Implement redirect flattening (update existing redirects pointing to old path)
6. Implement path cascade on section move/rename (rebuild `path` on all descendants)
7. Wire redirect resolution into `resolve_path` endpoint (301 response on redirect hit)

### Tests

- Full test suite from [Testing Strategy](./testing-strategy): redirect mechanics section
- Bulk move of a section with 10 descendants creates correct redirects for all

---

## Phase 5: Frontend Routing Rewrite

**Goal:** Replace the current catch-all route logic with the new resolve-path integration.

### Tasks

1. Update `[...slugPath].tsx` `getServerSideProps` to call `/sections/resolve-path/{path}`
2. Handle `type: "section"` response — render section's display type with children from `/sections/{id}/children`
3. Handle `type: "content"` response — render detail view based on `content_item.content_type`
4. Handle 301 response — return Next.js redirect
5. Handle 404 response — return notFound
6. Render breadcrumbs from response data
7. Remove old per-type API calls from the catch-all route (no more direct `/stories`, `/projects` calls from SSR)
8. Update the Next.js API proxy layer to pass through the new endpoints

### Tests

- Frontend unit tests from [Testing Strategy](./testing-strategy)
- Manual verification of all existing URLs

---

## Phase 6: Display Component Refactor

**Goal:** Update display components to consume `ListingItem[]` instead of type-specific arrays.

### Tasks

1. Create unified `ListingCard` component that renders any `ListingItem`
2. Update `CardGridDisplay` to use `ListingCard` instead of `ProjectCard`
3. Update `FeedDisplay` to use `ListingCard` instead of `StoryCard`
4. Update `GalleryDisplay` to use `ListingCard`
5. Remove per-type list components (`StoryCard`, `ProjectCard` for list contexts — detail components remain)
6. Update content registry: remove `listItem` entries (no longer needed per-type)
7. Add content type picker to "new content" action (since sections no longer imply a type)

### Tests

- Visual regression: existing section pages render the same content with new components
- Mixed content types render correctly in all display types

---

## Phase 7: Seed Data & E2E Tests

**Goal:** Update test infrastructure for nested routing.

### Tasks

1. Create seed migration for nested section hierarchy (the tree from testing-strategy.md)
2. Seed 2-3 content items per section
3. Update e2e mock server (`mock-server.ts`) with `resolve-path` endpoint
4. Update e2e test data (`test-data.ts`) with nested section hierarchy
5. Update API mock fixture for client-side calls
6. Write all Playwright e2e tests from [Testing Strategy](./testing-strategy)
7. Update `make dev-local` to auto-seed nested hierarchy

### Tests

- All e2e tests pass
- `make test` passes
- `make test-frontend-unit` passes
- `make test-frontend` passes

---

## Phase 8: Documentation & Cleanup

**Goal:** Final documentation updates, remove dead code.

### Tasks

1. Update `docs-site/pages/architecture/overview.mdx` with nested routing architecture
2. Write ADR for the migration decision
3. Remove old per-type API proxy routes that are no longer used
4. Remove `content_type` references from section-related frontend code
5. Update CLAUDE.md if any commands or conventions changed
6. Clean up any feature flags or backward-compatibility code from the transition

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing URLs break | Phase 1 populates `path = slug` for current sections; Phase 5 resolves them identically to the old system |
| Performance regression on deep paths | Materialized `path` field with index means resolution is O(1) for section lookup, O(N) only for content search across collections |
| Data migration corrupts existing content | Migration is additive — new fields and indexes only; no existing fields are removed until Phase 8 cleanup |
| Move operation creates orphaned redirects | Redirect flattening prevents chains; expired redirects are cleaned up by TTL or admin action |
| Frontend/backend version skew during deploy | Each phase is independently deployable; the old frontend works against the new backend and vice versa during transition |
