# Redirects & Moves

## When Redirects Are Created

Redirects are written automatically whenever a content item or section changes location. Users never create redirects manually. Three operations trigger redirect creation:

1. **Moving a content item** to a different section
2. **Moving a section** to a different parent
3. **Renaming a section slug**

## Moving a Content Item

Reassigning a content item's `section_id` to a different section.

```
Before: /creative-work/photography/beach-sunset
After:  /creative-work/favorites/beach-sunset
```

### Steps

1. Compute the old path: `{old_section.path}/{item.slug}`
2. Check that the slug doesn't collide in the target section
3. Update `section_id` on the content document
4. Compute the new path: `{new_section.path}/{item.slug}`
5. Write a redirect: `old_path -> new_path`
6. Flatten any existing redirects that pointed to `old_path` — update them to point to `new_path` directly

### API

```
PUT /content/{content_type}/{content_id}/move
Body: { "target_section_id": "..." }
```

Returns the updated content item with its new path, or 409 if the slug collides in the target section.

## Moving a Section

Changing a section's `parent_id` to a different parent section (or to `null` for top-level).

This is the heavier operation because it cascades to every descendant.

```
Before:
  /creative-work/photography/       (section)
  /creative-work/photography/portraits/   (child section)
  /creative-work/photography/portraits/beach-sunset  (content)

After (move photography under /archive):
  /archive/photography/
  /archive/photography/portraits/
  /archive/photography/portraits/beach-sunset
```

### Steps

1. Validate: target parent must not be a descendant of the section being moved (prevents cycles)
2. Compute old paths for the section and all descendants
3. Update `parent_id` on the section
4. Rebuild `path` on the section: `{new_parent.path}/{section.slug}`
5. Recursively rebuild `path` on all descendant sections
6. For every affected section, compute old and new content item paths
7. Bulk-write redirects for all changed paths (sections and content items)
8. Flatten any existing redirects that pointed to any of the old paths

### Cycle Detection

Before processing a move, walk up from the target parent to the root. If the section being moved appears in that chain, the move would create a cycle. Reject with 400.

```python
async def would_create_cycle(section_id: str, new_parent_id: str) -> bool:
    current = new_parent_id
    while current is not None:
        if current == section_id:
            return True
        parent = await db.sections.find_one({"_id": ObjectId(current)})
        current = parent["parent_id"] if parent else None
    return False
```

### API

```
PUT /sections/{section_id}/move
Body: { "target_parent_id": "..." | null }
```

Returns the updated section with its new path, or 400 if the move would create a cycle, or 409 if the slug collides with a sibling in the target parent.

## Renaming a Section Slug

Changing a section's slug triggers the same cascade as a move — the `path` changes for the section and every descendant.

```
Before: /creative-work/photography/
After:  /creative-work/photos/
```

This is handled by the existing section update endpoint. When the slug changes, the update handler:

1. Checks the new slug doesn't collide with siblings
2. Rebuilds `path` on the section and all descendants
3. Writes redirects for all affected paths
4. Flattens existing redirect chains

## Redirect Flattening

Redirect chains are prevented by flattening on write, not on read.

When content moves from A to B:
- Write redirect: `A -> B`

When that same content later moves from B to C:
- Write redirect: `B -> C`
- Update existing redirect: `A -> B` becomes `A -> C`

This guarantees that resolving any old path requires at most one redirect lookup. No chains, no loops.

```python
async def write_redirect(old_path: str, new_path: str, content_id: str = None):
    # Write the new redirect
    await db.redirects.update_one(
        {"old_path": old_path},
        {"$set": {
            "new_path": new_path,
            "content_id": content_id,
            "created_at": utcnow(),
        }},
        upsert=True
    )

    # Flatten: update any existing redirects that pointed to old_path
    await db.redirects.update_many(
        {"new_path": old_path},
        {"$set": {"new_path": new_path}}
    )
```

## Redirect Expiry

Redirects can optionally have an `expires_at` field. When set, the redirect is ignored after that date and the path returns 404. This is useful for cleaning up after large reorganizations where old URLs are no longer worth preserving.

By default, redirects are permanent (`expires_at: null`). Expiry can be set via an admin API or a cleanup script.

## Edge Cases

| Case | Behavior |
|------|----------|
| Move to same section | No-op, return current state |
| Slug collision in target | 409 Conflict, move rejected |
| Move into own descendant | 400 Bad Request (cycle detection) |
| Redirect to a path that was also redirected | Flattened on write, single hop |
| Expired redirect | Treated as non-existent, returns 404 |
| Move unpublished content | Redirect still created (URL may have been shared) |
| Delete content that has redirects | Redirects remain but resolve to 404 on the new path (acceptable — the content is gone) |
