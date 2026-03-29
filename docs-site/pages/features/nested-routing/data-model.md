# Data Model

## Section (Folder)

Sections define the site's hierarchical structure. Every section is a folder that can contain both child sections and content items.

```typescript
interface Section {
  id: string;
  slug: string;              // URL segment, unique within parent
  title: string;
  parent_id: string | null;  // null = top-level
  path: string;              // materialized full path: "creative-work/photography"
  display_type: DisplayType; // how to render children in list view
  nav_visibility: "main" | "secondary" | "hidden";
  sort_order: number;
  is_published: boolean;
  icon: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}
```

### Key changes from current model

- **`path` field added.** Materialized full path from root to this section. Rebuilt on move or rename. Indexed for fast lookup.
- **`content_type` removed.** Sections no longer constrain what content types they contain. Content items carry their own type.
- **Slug uniqueness scoped to parent.** The unique index changes from `slug` (global) to `(parent_id, slug)` (within parent). Two sibling sections cannot share a slug, but `blog/draft` and `projects/draft` can both exist.

### Indexes

```python
# Unique path for URL resolution
{"path": 1}                          # unique

# Unique slug within parent (filesystem semantics)
{"parent_id": 1, "slug": 1}         # unique

# Navigation queries
{"nav_visibility": 1, "sort_order": 1}

# Child section queries
{"parent_id": 1, "sort_order": 1}

# Published content filtering
{"is_published": 1, "sort_order": 1}
```

---

## Content Items

All content types (story, project, page, photo essay, and future types like film review, podcast) share the same relationship to sections:

```typescript
// Every content type has these fields
interface ContentBase {
  id: string;
  slug: string;              // unique within its section
  section_id: string;        // which section (folder) this item lives in
  content_type: string;      // "story" | "project" | "photo_essay" | "page" | ...
  title: string;
  summary: string | null;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;      // flag for broadsheet inclusion
  created_at: string;
  updated_at: string;
  user_id: string | null;
}
```

Content items extend `ContentBase` with type-specific fields:

- **Story**: `content` (rich text HTML)
- **Project**: `content`, `technologies[]`, `github_url`, `live_url`
- **Photo Essay**: `photos[]`, `cover_image`
- **Page**: `content`, `page_type`
- **Film Review** (future): `rating`, `year`, `director`, `content`
- **Podcast** (future): `audio_url`, `duration`, `transcript`, `content`

### Slug uniqueness for content

Content item slugs are unique within their section, not globally. Enforced by a compound index:

```python
{"section_id": 1, "slug": 1}  # unique
```

This means `/blog/my-post` and `/reviews/my-post` can both exist. Moving content to a new section could create a collision — the move operation must check and fail if the slug already exists in the target section.

---

## Redirects

A new collection that maps old paths to new paths after content or section moves.

```typescript
interface Redirect {
  id: string;
  old_path: string;          // the URL path that no longer resolves
  new_path: string;          // where it should go now
  content_id: string | null; // if this redirect is for a content item
  content_type: string | null;
  created_at: string;
  expires_at: string | null; // null = permanent, or a TTL date
}
```

### Indexes

```python
{"old_path": 1}   # unique, fast lookup during path resolution
```

### Redirect flattening

When a redirect chain forms (A moved to B, then B moved to C), all existing redirects pointing to B are updated to point directly to C. This prevents chains and keeps resolution to a single lookup.

---

## Collection Summary

| Collection | Purpose | New? |
|------------|---------|------|
| `sections` | Hierarchical site structure | Modified (add `path`, remove `content_type`) |
| `stories` | Blog posts and articles | Unchanged |
| `projects` | Portfolio items | Unchanged |
| `pages` | Static pages | Unchanged |
| `photo_essays` | Photo galleries | Unchanged |
| `redirects` | Path redirect mappings | New |

Content collections are unchanged in schema. The `section_id` field already exists on all of them. The only behavioral change is that `section_id` now points into a hierarchical tree rather than a flat list.
