# ADR 0005: Dynamic Sections Architecture

## Status
Accepted

## Context
The site structure is currently hardcoded in React components, with fixed navigation pointing to predefined routes (Blog, About, Projects, Contact). This has several limitations:

1. Adding new sections requires code changes and deployment
2. No way for admins to organize content hierarchically
3. Navigation structure is rigid and requires developer intervention to modify
4. Different section types (blog feed, project grid, static pages) have separate implementations
5. Content cannot be easily reorganized or nested
6. The navigation doesn't reflect the actual content structure

The goal is to enable dynamic site organization where admins can create sections, choose how they display content, and organize navigation - all without code changes.

## Decision
We will implement a Section-based architecture with the following design:

### Core Concept: Sections

A **Section** represents a configurable area of the site with:
- **display_type**: How content is rendered (feed, card-grid, static-page, gallery)
- **content_type**: What type of items belong here (story, project, page, image)
- **hierarchy**: Unlimited nesting via `parent_id`
- **navigation visibility**: Where the section appears (main nav, secondary, hidden)

This separates "how to display" from "what to display", enabling combinations like:
- Photography gallery (gallery display + image content)
- Blog feed (feed display + story content)
- Project showcase (card-grid display + project content)

### Data Models

**Section**
```
sections
├── _id
├── title              # Display name
├── slug               # URL segment: "blog", "photography"
├── parent_id          # null = top-level, otherwise nested
├── display_type       # "feed" | "card-grid" | "static-page" | "gallery"
├── content_type       # "story" | "project" | "page" | "image"
├── nav_visibility     # "main" | "secondary" | "hidden"
├── sort_order         # Position among siblings
├── is_published
├── is_deleted         # Soft delete
├── created_at
└── updated_at
```

**NavLink (Hamburger Menu)**
```
nav_links
├── _id
├── label              # Display text
├── url                # Internal path or external URL
├── sort_order
├── is_published
├── created_at
└── updated_at
```

NavLinks are separate from Sections - they represent a curated list of links for the hamburger/mobile menu, not tied to the section hierarchy.

**Content Items**
Existing models (Story, Project, Page) gain a `section_id` field linking them to their parent section.

### Display Type Registry

Frontend uses a registry pattern to render sections:

```typescript
const displayRegistry = {
  feed: FeedDisplay,           // Infinite scroll list
  'card-grid': CardGridDisplay, // Grid of cards
  'static-page': StaticPageDisplay, // Single content block
  gallery: GalleryDisplay,      // Image-focused grid/masonry
};
```

Adding new display types requires:
1. Create React component
2. Register in displayRegistry
3. Add to DisplayType literal in backend

### Content Type Registry

```typescript
const contentRegistry = {
  story: {
    listItem: StoryCard,
    detail: StoryDetail,
    editor: StoryEditor,
  },
  project: {
    listItem: ProjectCard,
    detail: ProjectDetail,
    editor: ProjectEditor,
  },
};
```

### URL Routing

Dynamic catch-all route: `/[...slugPath]`

Resolution:
1. Parse slug path: `/creative-work/photography/portraits`
2. Walk sections table to resolve each segment
3. Load section config (display_type, content_type)
4. If extra segment → treat as content item slug
5. Render appropriate display or detail component

### Navigation Structure

**Main Nav**: Built from section hierarchy where `nav_visibility = "main"`
- Flyouts show child sections + "New [Item]" action for admins

**Hamburger Menu**: Separate NavLink collection, manually curated
- Allows linking to sections, external sites, or custom pages
- Independent from section hierarchy

### API Design

**Sections**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/sections` | GET | No | List all sections (tree structure) |
| `/sections/{id}` | GET | No | Get section by ID |
| `/sections/slug/{slug}` | GET | No | Get section by slug |
| `/sections` | POST | Yes | Create section |
| `/sections/{id}` | PUT | Yes | Update section |
| `/sections/{id}` | DELETE | Yes | Soft delete section |

**NavLinks**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/navlinks` | GET | No | List all navlinks (sorted) |
| `/navlinks/{id}` | GET | No | Get navlink by ID |
| `/navlinks` | POST | Yes | Create navlink |
| `/navlinks/{id}` | PUT | Yes | Update navlink |
| `/navlinks/{id}` | DELETE | Yes | Hard delete navlink |

### Admin UIs

**Quick Wizard (Mobile)**
1. Tap + → Enter section name
2. Pick type from icons (Feed, Grid, Page, Gallery)
3. Choose nav placement (Main, Secondary, Hidden)
4. Section created with sensible defaults

**Full Editor**
- Tree view with drag-and-drop reordering
- Section edit form (all fields)
- NavLink management

### Permissions

Phase 1: Admin-only (existing Google OAuth)
Future: Role-based permissions per section

## Consequences

### Positive
- Site structure is configuration-driven, no code changes needed
- Unlimited nesting enables deep content hierarchies
- Display type separation from content type enables flexible combinations
- Registry pattern makes adding new types straightforward
- Main nav automatically reflects section hierarchy
- Hamburger menu allows curated link collections
- Soft delete for sections enables recovery
- Incremental migration from hardcoded structure

### Negative
- More complex than static routes
- Section resolution adds database lookup to page loads (cacheable)
- Two navigation systems (main nav + hamburger) to maintain
- Registry pattern requires developer for new component types
- Backfilling section_id on existing content requires migration

## Implementation Phases

Each phase is independently deployable:

1. **Foundation (Backend)** - Section and NavLink models, CRUD APIs ✅
2. **Migration Infrastructure** - Add section_id to content, seed initial sections
3. **Display Registry (Frontend)** - Extract displays into registry pattern
4. **Dynamic Routing** - Catch-all route with section resolution
5. **Navigation from Database** - Replace hardcoded SECTIONS array
6. **Quick Wizard** - Mobile-friendly section creation
7. **Full Admin Editor** - Tree view with drag-and-drop
8. **Documentation** - Update docs-site

## Migration Strategy

- Database changes are additive (section_id nullable during transition)
- Old routes kept as fallbacks until new routing verified
- Feature flag for new routing enables rollback
- Existing content backfilled with appropriate section_id

## Future Considerations

- Permission system (editor roles per section)
- Section-specific engagement configuration
- Section templates for common patterns
- Content scheduling per section
- Multi-language sections
