# Path Resolution

## The Problem

Given a URL like `/creative-work/photography/portraits/beach-sunset`, the system must determine:
1. Which segments are sections (folders)?
2. Is the last segment a section or a content item?
3. What should the frontend render?

Three approaches were considered.

## Approaches Evaluated

### A) Walk the tree from the frontend

Resolve each slug segment left-to-right with individual API calls. If the last segment isn't a section, treat it as a content item.

- N database lookups for N-deep paths
- Complexity lives in the frontend
- Chatty — multiple HTTP round-trips from the browser or SSR layer

### B) Materialized path lookup

Query sections by the `path` field directly. Try the full path as a section first. On miss, split off the last segment, look up the parent path as a section, then look up the last segment as a content item.

- Two lookups max regardless of depth
- Frontend still needs branching logic for "is this a section or content?"
- Path field must be kept in sync on moves

### C) Single backend resolution endpoint (chosen)

One endpoint: `GET /sections/resolve-path/{full_path}`. The backend does whatever lookup strategy is optimal (materialized path, tree walk, caching) and returns a structured response. The frontend makes one HTTP call.

**This is the chosen approach.** The frontend stays simple. The backend owns the resolution strategy and can optimize it independently. Breadcrumbs come free since the backend already resolved the full chain.

## Why C

- **One HTTP call.** Regardless of path depth, the frontend makes a single request during SSR. This matters for time-to-first-byte.
- **Backend owns optimization.** The resolution strategy can change (add caching, switch from tree walk to materialized path, add denormalized lookups) without touching the frontend.
- **Breadcrumbs are a byproduct.** The backend resolves every ancestor on the way down — it can return them as breadcrumbs at no extra cost.
- **Redirect resolution is co-located.** If the path doesn't resolve, the backend checks redirects and returns a 301 in the same call. The frontend doesn't need separate redirect-checking logic.

## Endpoint Design

### Request

```
GET /sections/resolve-path/{full_path}
```

Where `{full_path}` is the entire URL path with slashes: `creative-work/photography/portraits/beach-sunset`.

### Response: Section found (list view)

When the full path resolves to a section:

```json
{
  "type": "section",
  "section": {
    "id": "...",
    "title": "Portraits",
    "path": "creative-work/photography/portraits",
    "display_type": "gallery",
    "is_published": true
  },
  "breadcrumbs": [
    { "title": "Creative Work", "path": "creative-work" },
    { "title": "Photography", "path": "creative-work/photography" },
    { "title": "Portraits", "path": "creative-work/photography/portraits" }
  ]
}
```

### Response: Content item found (detail view)

When the last segment is a content item within a section:

```json
{
  "type": "content",
  "section": {
    "id": "...",
    "title": "Portraits",
    "path": "creative-work/photography/portraits",
    "display_type": "gallery"
  },
  "content_item": {
    "id": "...",
    "slug": "beach-sunset",
    "content_type": "photo_essay",
    "title": "Beach Sunset",
    "summary": "...",
    "image_url": "..."
  },
  "breadcrumbs": [
    { "title": "Creative Work", "path": "creative-work" },
    { "title": "Photography", "path": "creative-work/photography" },
    { "title": "Portraits", "path": "creative-work/photography/portraits" },
    { "title": "Beach Sunset", "path": "creative-work/photography/portraits/beach-sunset" }
  ]
}
```

### Response: Redirect

When the path doesn't resolve but a redirect exists:

```
HTTP 301
Location: /new/path/to/content
```

### Response: Not found

```
HTTP 404
{ "detail": "Path not found" }
```

## Resolution Algorithm

```python
def resolve_path(full_path: str):
    segments = full_path.strip("/").split("/")

    # Try the full path as a section first (fast path via index on `path`)
    section = db.sections.find_one({"path": full_path, "is_published": True})
    if section:
        return {"type": "section", "section": section, "breadcrumbs": build_breadcrumbs(section)}

    # Split off the last segment and try parent as section + last as content
    if len(segments) > 1:
        parent_path = "/".join(segments[:-1])
        item_slug = segments[-1]

        section = db.sections.find_one({"path": parent_path, "is_published": True})
        if section:
            # Search all content collections for this slug within this section
            content = find_content_in_section(section.id, item_slug)
            if content:
                return {
                    "type": "content",
                    "section": section,
                    "content_item": content,
                    "breadcrumbs": build_breadcrumbs(section, content)
                }

    # No section or content match — check redirects
    redirect = db.redirects.find_one({"old_path": full_path})
    if redirect:
        return HTTP 301 -> redirect.new_path

    return HTTP 404
```

### `find_content_in_section`

Searches across all content collections for an item with the given slug in the given section:

```python
async def find_content_in_section(section_id: str, slug: str):
    for collection_name, content_type in CONTENT_COLLECTIONS:
        item = await db[collection_name].find_one({
            "section_id": section_id,
            "slug": slug,
            "is_published": True,
            "deleted": {"$ne": True}
        })
        if item:
            item["content_type"] = content_type
            return item
    return None
```

The order of collection search doesn't matter for correctness since slugs are unique within a section across all content types. If a performance concern arises, the search order can be optimized based on the parent section's most common content type.

## Frontend Integration

The catch-all route `[...slugPath].tsx` simplifies significantly:

```typescript
export const getServerSideProps = async (context) => {
    const slugPath = (context.params?.slugPath as string[])?.join("/");
    const response = await fetch(`${BACKEND_URL}/sections/resolve-path/${slugPath}`);

    if (response.status === 301) {
        return { redirect: { destination: response.headers.get("Location"), permanent: true } };
    }

    if (response.status === 404) {
        return { notFound: true };
    }

    const data = await response.json();
    return { props: { data } };
};
```

The page component then branches on `data.type`:
- `"section"` -> render the section's `display_type` component with children
- `"content"` -> render the content item's detail view based on `content_type`
