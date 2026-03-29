# Display Types

## Section Display Types

Display types determine how a section renders its children. They operate on the uniform `ListingItem` interface and do not know or care about the underlying content types.

A display type is a React component that receives a list of `ListingItem` objects and renders them according to its layout strategy.

### Current Display Types

| Type | Layout | Pagination | Use Case |
|------|--------|------------|----------|
| `card-grid` | Responsive grid of cards | Paginated (limit/offset) | Projects, mixed content |
| `feed` | Vertical list, chronological | Infinite scroll | Blog posts, essays |
| `gallery` | Image-focused masonry/grid | Paginated | Photography, visual content |
| `static-page` | Single content block, no children | None | About, contact |

### Planned Display Types

| Type | Layout | Pagination | Use Case |
|------|--------|------------|----------|
| `broadsheet` | Editorial layout with featured items | None (curated) | Homepage, section landing pages |

## How Display Types Consume Data

Every display type calls the same endpoint:

```
GET /sections/{section_id}/children?limit=N&offset=M
```

The display type controls `limit`, `offset`, and rendering. The data shape is identical regardless of display type.

### card-grid

Renders `ListingItem[]` in a responsive CSS grid. Each item becomes a card with optional image, title, summary, and tags. Pagination controls at the bottom.

```
[ card ] [ card ] [ card ]
[ card ] [ card ] [ card ]
      [ 1  2  3  > ]
```

### feed

Renders `ListingItem[]` as a vertical list. Each item shows title, summary, date, and optional image. Loads more items on scroll via infinite scroll (increments offset).

```
--- item ---
--- item ---
--- item ---
  (loading)
```

### gallery

Renders `ListingItem[]` emphasizing images. Items without `image_url` are either hidden or rendered as text-only placeholders. Masonry or grid layout depending on viewport.

```
[ img ] [ img ][ img ]
[ img ][ img ] [ img ]
```

### static-page

Does not fetch children. Instead, fetches the section's associated page content (a single content item of type `page`). Renders the page's rich text content directly.

This display type is the exception — it doesn't use the children endpoint. It fetches a single content item by section ID and renders it as a full page.

### broadsheet (planned)

Pulls `is_featured` items from the section's subtree:

```
GET /sections/{section_id}/children?subtree=true&featured_only=true&limit=12
```

Editorial layout with a hero item, secondary items, and a grid of remaining items. The layout is position-based — the first featured item gets hero treatment, the next 2-3 get secondary placement, the rest fill a grid.

```
[       hero item       ]
[ secondary ][ secondary]
[ grid ][ grid ][ grid  ]
```

## Display Type Registry

The registry maps display type strings to React components:

```typescript
const displayRegistry: Record<string, React.ComponentType<DisplayProps>> = {
  'card-grid': CardGridDisplay,
  'feed': FeedDisplay,
  'gallery': GalleryDisplay,
  'static-page': StaticPageDisplay,
  'broadsheet': BroadsheetDisplay,
};

interface DisplayProps {
  section: Section;
  items: ListingItem[];
  total: number;
  pagination: { limit: number; offset: number };
  onPageChange: (offset: number) => void;
}
```

Adding a new display type requires:
1. Creating the React component implementing `DisplayProps`
2. Adding it to the registry
3. Adding the enum value to the backend's `DisplayType` validation

## Display Type vs Content Type

These are independent axes:

| | card-grid | feed | gallery | broadsheet |
|---|---|---|---|---|
| **story** | card with image + summary | full list entry | image emphasis | hero/secondary |
| **project** | card with tech stack | list entry | image emphasis | hero/secondary |
| **photo_essay** | card with cover | list entry | large images | hero/secondary |
| **podcast** | card with duration | list entry with play button | cover art grid | hero/secondary |

The display type decides layout. The `ListingItem` fields decide what's visible. A podcast in a card-grid renders the same card template as a story — it just has different field values (no `image_url`, has `tags` with episode info, etc.).
