# Photo Essays

Photo essays are themed photo collections displayed as masonry grids. Each essay groups related photographs under a title and description, with individual captions per photo. The feature adds `display_type: "gallery"` and `content_type: "photo_essay"` to the section/registry system.

## Data Model

A photo essay document in the `photo_essays` MongoDB collection:

```typescript
interface PhotoEssay {
  id: string;
  section_id: string;
  slug: string;
  user_id: string;
  title: string;
  description: string;
  cover_image_url: string;         // URL of the selected cover photo
  cover_image_position: string;    // CSS object-position value (e.g. "50% 50%")
  photos: Photo[];                 // Embedded array, ordered
  photo_count: number;             // Denormalized count of photos
  is_published: boolean;
  createdDate: string;
  updatedDate: string;
}

interface Photo {
  url: string;                 // Storage URL (GCS or local)
  srcset: string;              // Responsive image srcset
  caption: string;             // Optional text caption
  width: number;               // Original pixel width
  height: number;              // Original pixel height
  sort_order: number;          // Position in the essay
}
```

Photos are embedded subdocuments, not a separate collection. Dimensions are captured at upload time and used by the masonry layout to calculate aspect ratios without layout shift.

## Section Setup

To add a photo essay section:

1. Create a section with `display_type: "gallery"` and `content_type: "photo_essay"`.
2. Navigate to the section URL. The registry resolves `gallery` to `GalleryDisplay` and `photo_essay` to the photo essay content fetcher.
3. As an authenticated admin, use the editor to create essays.

## Admin Editor

The photo essay editor (`PhotoEssayEditor`) provides:

- **Bulk upload**: Drag-and-drop or file picker for multiple images. Files upload in parallel.
- **Photo arrangement**: Drag to reorder. Sort order persists to the `sort_order` field.
- **Captions**: Inline text input per photo.
- **Cover selection**: Click any photo to designate it as the cover image.
- **Title and description**: Text fields at the top of the editor.
- **Publish toggle**: Controls `is_published` visibility.

## Gallery Display (Landing Page)

The landing page for a gallery section renders all published photo essays as cover image cards in a vertical feed. Each card shows the cover image, title, and description. Clicking a card navigates to the essay detail page.

### CSS Classes

| Class | Purpose |
|---|---|
| `.gallery-card` | Card container |
| `.gallery-card__image` | Cover image |
| `.gallery-card__title` | Essay title |
| `.gallery-card__description` | Essay description |
| `.gallery-card__meta` | Date and photo count |

## Masonry Grid (Detail Page)

The essay detail page displays all photos in a CSS-columns masonry layout. Column count is responsive:

| Viewport | Columns |
|---|---|
| Mobile (<640px) | 1 |
| Tablet (640-1024px) | 2 |
| Desktop (>1024px) | 3 |

Each item preserves the photo's natural aspect ratio. No cropping.

### CSS Classes

| Class | Purpose |
|---|---|
| `.masonry-grid` | Grid container (CSS columns) |
| `.masonry-grid__item` | Individual photo wrapper |
| `.masonry-grid__image` | Photo `<img>` element |
| `.masonry-grid__caption` | Caption overlay or text |

## Photo Viewer (Fullscreen)

Clicking any photo in the masonry grid opens a fullscreen viewer overlay.

### Controls

| Input | Action |
|---|---|
| Left arrow / swipe left | Previous photo |
| Right arrow / swipe right | Next photo |
| Escape / click backdrop | Close viewer |
| Caption button | Toggle caption visibility |

### CSS Classes

| Class | Purpose |
|---|---|
| `.photo-viewer` | Fullscreen overlay container |
| `.photo-viewer__image` | Displayed photo |
| `.photo-viewer__caption` | Caption text |
| `.photo-viewer__nav` | Navigation arrow buttons |
| `.photo-viewer__close` | Close button |
| `.photo-viewer__counter` | Photo index indicator (e.g., "3 / 12") |

## Detail Page Layout

The detail page wraps the essay header (title, description) and the masonry grid.

### CSS Classes

| Class | Purpose |
|---|---|
| `.photo-essay-page` | Page container |
| `.photo-essay-page__header` | Title and description block |
| `.photo-essay-page__title` | Essay title |
| `.photo-essay-page__description` | Essay description |
| `.photo-essay-page__grid` | Masonry grid wrapper |

## Editor Layout

### CSS Classes

| Class | Purpose |
|---|---|
| `.photo-essay-editor` | Editor container |
| `.photo-essay-editor__dropzone` | Upload drag-and-drop area |
| `.photo-essay-editor__grid` | Photo arrangement grid |
| `.photo-essay-editor__item` | Individual photo in editor |
| `.photo-essay-editor__caption` | Caption input field |
| `.photo-essay-editor__cover-badge` | Cover image indicator |

## Template Customization

All classes above are defined in the template's `components.css`. To customize the gallery appearance:

1. Copy `frontend/src/templates/default/styles/components.css`.
2. Modify the `.gallery-card`, `.masonry-grid`, `.photo-viewer`, `.photo-essay-page`, and `.photo-essay-editor` class groups.
3. Update imports in `_app.tsx` to point to the new template.

Column count, gap spacing, card dimensions, overlay colors, and caption typography are all controlled through CSS custom properties in `tokens.css`.
