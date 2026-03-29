# Testing Strategy

Testing is structured in three tiers: backend unit/integration tests, frontend unit tests, and end-to-end Playwright tests. Every tier covers the new path resolution, redirect mechanics, and listing contract.

---

## Backend Tests (pytest)

### Path Resolution

| Test | Description |
|------|-------------|
| Resolve top-level section | `/blog` resolves to the blog section |
| Resolve nested section | `/creative-work/photography` resolves to photography section |
| Resolve deeply nested section | `/a/b/c/d` resolves through 4 levels |
| Resolve content item | `/blog/my-post` resolves to section=blog, content=my-post |
| Resolve nested content item | `/creative-work/photography/beach-sunset` resolves correctly |
| Path not found returns 404 | `/nonexistent/path` returns 404 |
| Unpublished section returns 404 | Unpublished sections are not resolvable by public requests |
| Redirect resolution | Moved content returns 301 with new path |
| Expired redirect returns 404 | Redirect past `expires_at` is ignored |
| Breadcrumbs are correct | Response includes full ancestor chain with titles and paths |

### Redirect Mechanics

| Test | Description |
|------|-------------|
| Move content writes redirect | Moving a story from section A to B creates a redirect |
| Move section cascades paths | Moving a section updates all descendant paths |
| Move section cascades redirects | All descendant content gets redirects written |
| Redirect flattening | A->B then B->C results in A->C (no chain) |
| Cycle detection | Moving a section into its own descendant returns 400 |
| Slug collision on move | Moving content to a section where the slug exists returns 409 |
| Move to same section is no-op | No redirect created, returns current state |
| Rename slug cascades | Renaming a section's slug updates all descendant paths |

### Section Hierarchy

| Test | Description |
|------|-------------|
| Create child section | Section created with `parent_id` gets correct `path` |
| Slug unique within parent | Two children of the same parent cannot share a slug |
| Slug unique across parents | Two children of different parents can share a slug |
| Delete section with children | Verify behavior (soft delete, children remain but become orphans?) |
| `path` rebuilt on parent rename | Child paths update when parent slug changes |

### Children Endpoint

| Test | Description |
|------|-------------|
| Direct children returned | `GET /sections/{id}/children` returns child sections + content items |
| Sections sorted first | Child sections appear before content items |
| Content from multiple types | Mixed stories and projects in one section both appear |
| Pagination works | `limit` and `offset` control result window |
| Subtree query | `subtree=true` returns content from all descendants |
| Featured filter | `featured_only=true` returns only `is_featured` items |
| Unpublished filtered | Unpublished items excluded unless authenticated |
| ListingItem shape correct | Response items conform to the listing contract |

### Migration

| Test | Description |
|------|-------------|
| Existing sections get `path` field | Migration adds `path` to all existing sections |
| `content_type` removed from sections | Field no longer present after migration |
| Existing content still resolves | Current URLs continue to work post-migration |
| Slug uniqueness index updated | New compound index `(parent_id, slug)` replaces global `slug` index |

---

## Frontend Unit Tests (vitest)

### Path Resolution Hook

| Test | Description |
|------|-------------|
| Section response renders display type | `type: "section"` response triggers correct display component |
| Content response renders detail view | `type: "content"` response renders detail based on `content_type` |
| Redirect triggers navigation | 301 response causes client-side redirect |
| 404 shows not found | 404 response renders the not-found page |
| Breadcrumbs render | Breadcrumb data from response renders as navigation |

### ListingCard Component

| Test | Description |
|------|-------------|
| Renders with all fields | Image, title, summary, tags, date all present |
| Renders without optional fields | No image, no summary, no video — renders title and date only |
| Content type doesn't affect rendering | A story and a project with same fields render identically |
| Link points to correct path | `href` combines section path with item slug |

### Display Components

| Test | Description |
|------|-------------|
| CardGrid renders items in grid | Correct CSS grid layout with pagination |
| Feed renders items in list | Vertical list with infinite scroll trigger |
| Gallery renders image-focused layout | Items with images emphasized |
| Mixed content types in one display | Stories and projects render together |

---

## End-to-End Tests (Playwright)

### Navigation & Routing

| Test | Description |
|------|-------------|
| Top-level section loads | Navigate to `/blog`, page renders |
| Nested section loads | Navigate to `/creative-work/photography`, page renders |
| Content item detail loads | Navigate to `/blog/my-post`, detail view renders |
| Nested content item loads | Navigate to `/creative-work/photography/beach-sunset`, detail renders |
| Deep nesting works | Navigate through 4+ levels, each resolves correctly |
| Breadcrumbs navigate | Click breadcrumb, navigate to ancestor section |
| 404 for bad paths | Navigate to `/nonexistent/path`, 404 page renders |

### Redirects

| Test | Description |
|------|-------------|
| Old URL redirects | After moving content, old URL redirects to new location |
| Redirect chain flattened | After two moves, original URL goes directly to final location |
| Browser URL updates | After redirect, address bar shows the new URL |

### Mixed Content Sections

| Test | Description |
|------|-------------|
| Section shows mixed types | A section containing stories and projects renders both |
| Card grid with mixed types | Grid layout renders cards for different content types |
| Click-through to correct detail | Clicking a story card opens story detail; clicking a project card opens project detail |

### Content Creation

| Test | Description |
|------|-------------|
| New content in nested section | Create a story inside a nested section, verify it appears in the section's list |
| Content type picker | "New content" action shows type picker, selected type opens correct editor |
| Created content URL is correct | New content's URL reflects the section hierarchy |

### Admin Operations

| Test | Description |
|------|-------------|
| Create nested section | Create a child section, verify it appears under parent |
| Move content via admin | Move a content item, verify redirect works and new location correct |
| Rename section | Rename a section's slug, verify old URLs redirect |

---

## Test Data Seeding

Local development and e2e tests require a consistent section hierarchy for testing. The seed data creates:

```
/ (root)
├── blog/                          (feed, contains stories)
│   ├── tech/                      (feed, contains stories)
│   └── personal/                  (feed, contains stories)
├── creative-work/                 (broadsheet)
│   ├── photography/               (gallery)
│   │   └── portraits/             (gallery, contains photo essays)
│   └── writing/                   (feed, contains stories)
├── projects/                      (card-grid, contains projects)
├── about/                         (static-page)
└── contact/                       (static-page)
```

Each section is seeded with 2-3 content items of appropriate types so that list views, pagination, and mixed-type rendering are all exercisable.

The e2e mock server (`frontend/e2e/mock-server.ts`) and test data (`frontend/e2e/test-data.ts`) must be updated to serve this hierarchy through the new `resolve-path` endpoint and children endpoint.

---

## Manual Testing Checklist

Before shipping, manually verify against the local dev environment (`make dev-local`):

- [ ] Navigate to every seeded section at every depth level
- [ ] Click through to content items from list views
- [ ] Create content in a nested section, verify URL
- [ ] Move content between sections, verify old URL redirects
- [ ] Rename a section, verify all child URLs redirect
- [ ] Check breadcrumbs at every level
- [ ] Verify 404 page for non-existent paths
- [ ] Test with both light and dark mode
- [ ] Test mobile navigation with nested sections
- [ ] Verify the "new content" type picker works in nested sections
