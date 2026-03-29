# Listing Contract

## The Uniform Listing Interface

Every content type — story, project, photo essay, page, film review, podcast, and any future type — must serialize to a common shape for list views. Section display types (card grid, infinite scroll, gallery, broadsheet) consume this shape without knowing or caring what the underlying content type is.

This is the core abstraction that makes mixed-type sections work.

## ListingItem Shape

```typescript
interface ListingItem {
  id: string;
  slug: string;
  content_type: string;        // "story" | "project" | "photo_essay" | "page" | ...
  title: string;
  summary: string | null;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}
```

Every field after `content_type` is optional in rendering — a display component must handle `null` values gracefully. A podcast may not have an `image_url`. A static page may not have a `summary`. The display component renders whatever is present and omits what isn't.

## What Each Content Type Provides

| Field | Story | Project | Photo Essay | Page | Film Review* | Podcast* |
|-------|-------|---------|-------------|------|-------------|----------|
| title | title | title | title | title | title | title |
| summary | first ~200 chars of content | summary | description | first ~200 chars | one-line review | episode description |
| image_url | first image in content | image_url | cover_image | null | poster_url | cover_art_url |
| video_url | first video in content | null | null | null | trailer_url | null |
| tags | tags | technologies | tags | tags | genres | tags |
| is_featured | is_featured | is_featured | is_featured | false | is_featured | is_featured |

*Future content types — included to validate the interface generalizes.

## Unified Children Endpoint

A single endpoint returns all children of a section: both child sections and content items, in one response.

### Request

```
GET /sections/{section_id}/children?limit=20&offset=0&featured_only=false
```

### Response

```json
{
  "items": [
    {
      "item_type": "section",
      "id": "...",
      "slug": "photography",
      "title": "Photography",
      "path": "creative-work/photography",
      "display_type": "gallery",
      "image_url": null,
      "sort_order": 0
    },
    {
      "item_type": "content",
      "id": "...",
      "slug": "my-first-post",
      "content_type": "story",
      "title": "My First Post",
      "summary": "...",
      "image_url": "...",
      "video_url": null,
      "tags": ["personal"],
      "is_featured": true,
      "created_at": "2026-03-29T...",
      "updated_at": "2026-03-29T..."
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

Child sections and content items are interleaved. Sections come first (sorted by `sort_order`), then content items (sorted by `created_at` descending, or by `sort_order` if manually ordered).

### Subtree queries for broadsheet

The broadsheet display type needs flagged items from the entire subtree, not just direct children. A separate parameter controls this:

```
GET /sections/{section_id}/children?subtree=true&featured_only=true&limit=10
```

When `subtree=true`, the backend:
1. Collects all descendant section IDs (recursive query on `parent_id`)
2. Queries all content collections where `section_id` is in that set and `is_featured=true`
3. Returns them as `ListingItem` objects

This is the only query that crosses section boundaries, and it only goes downward in the tree.

## Backend Implementation

Each content collection needs a projection that maps to `ListingItem`. This replaces the current per-type list endpoints (`GET /stories`, `GET /projects`, etc.) for section-scoped queries.

```python
LISTING_PROJECTION = {
    "_id": 1,
    "slug": 1,
    "title": 1,
    "summary": 1,
    "image_url": 1,
    "video_url": 1,
    "tags": 1,
    "is_published": 1,
    "is_featured": 1,
    "createdDate": 1,
    "updatedDate": 1,
    "user_id": 1,
    "section_id": 1,
}
```

Content types that derive listing fields from other data (e.g., story summary from content HTML) should compute and store those fields on write rather than computing them on read. This keeps the listing query fast and projection-only.

## Frontend: Display Components

Display components receive `ListingItem[]` and render them. They do not import content-type-specific components for list rendering. A single `ListingCard` component handles all types:

```typescript
function ListingCard({ item }: { item: ListingItem }) {
  const href = `/${sectionPath}/${item.slug}`;

  return (
    <a href={href}>
      {item.image_url && <img src={item.image_url} alt={item.title} />}
      {item.video_url && <video src={item.video_url} />}
      <h3>{item.title}</h3>
      {item.summary && <p>{item.summary}</p>}
      <time>{item.created_at}</time>
      <TagList tags={item.tags} />
    </a>
  );
}
```

Content-type-specific rendering only happens in the detail view, which is loaded when the user clicks through to a specific item.
