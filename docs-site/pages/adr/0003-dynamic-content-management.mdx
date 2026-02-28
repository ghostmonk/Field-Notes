# ADR 0003: Dynamic Content Management System

## Status
Accepted

## Context
The application was initially a single-page scrolling blog with static placeholder content for new sections (About, Projects, Contact). This had several limitations:

1. Content was hardcoded in React components, requiring code deployments for any text changes
2. No way for non-technical users to update page content
3. Projects section needed to support multiple items with individual detail pages
4. About and Contact pages needed editable rich text content
5. Content management needed to follow existing patterns established by the Stories feature

## Decision
We implemented a database-backed content management system with the following architecture:

### Data Models

**Pages (About, Contact)**
- Single document per page type stored in MongoDB `pages` collection
- Fields: `title`, `content` (rich text), `page_type`, `is_published`, timestamps
- Page type is a discriminator (`about` | `contact`) ensuring only one document per type
- Soft delete pattern consistent with Stories

**Projects**
- Multiple documents stored in MongoDB `projects` collection
- Two response models: `ProjectCard` (lightweight for listings) and `ProjectResponse` (full detail)
- Fields include: `title`, `summary`, `content`, `technologies[]`, `github_url`, `live_url`, `image_url`, `is_featured`, `sort_order`, `slug`
- Slug auto-generated from title for SEO-friendly URLs
- Soft delete pattern consistent with Stories

### API Design

**Pages API**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/pages/{page_type}` | GET | No | Retrieve page by type |
| `/pages/{page_type}` | PUT | Yes | Upsert page content |
| `/pages/{page_type}` | DELETE | Yes | Soft delete page |

**Projects API**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/projects` | GET | No | List projects (returns cards) |
| `/projects/slug/{slug}` | GET | No | Get project by slug |
| `/projects/{id}` | GET | Yes | Get project by ID (admin) |
| `/projects` | POST | Yes | Create project |
| `/projects/{id}` | PUT | Yes | Update project |
| `/projects/{id}` | DELETE | Yes | Soft delete project |

### Frontend Architecture
- Next.js API routes as proxies to backend (consistent with existing Stories pattern)
- In-memory caching with 5-minute TTL for public content
- Cache invalidation on mutations
- Client-side data fetching with loading/error states
- Dynamic route for project detail pages (`/projects/[slug]`)

## Consequences

### Positive
- Content can be updated without code deployments
- Consistent API patterns with existing Stories feature
- SEO-friendly URLs for projects via slug-based routing
- Lightweight card responses reduce payload size for project listings
- Featured flag enables highlighting specific projects
- Sort order provides manual control over project display order
- Rich text content supports formatted About/Contact pages
- Caching reduces database load for public content

### Negative
- Pages will show "not found" state until initial content is created via API
- No admin UI yet for content management (requires API calls or future admin panel)
- Two separate collections to maintain (pages, projects)
- Frontend renders raw HTML content, requiring trust in backend sanitization

## Implementation Notes

### Backend Files Created/Modified
- `models/page.py` - Pydantic models for pages
- `models/project.py` - Pydantic models for projects
- `handlers/pages.py` - API endpoints for pages
- `handlers/projects.py` - API endpoints for projects
- `database.py` - Added collection getters
- `app.py` - Registered new routers

### Frontend Files Created/Modified
- `types/api.ts` - Added Page, Project, ProjectCard types
- `lib/api-client.ts` - Added pages and projects methods
- `pages/api/pages/[pageType].ts` - Next.js API proxy
- `pages/api/projects/index.ts` - Next.js API proxy for list
- `pages/api/projects/[slug].ts` - Next.js API proxy for detail
- `pages/about.tsx` - Updated to fetch from database
- `pages/contact.tsx` - Updated to fetch from database
- `pages/projects.tsx` - Updated to display project cards
- `pages/projects/[slug].tsx` - New project detail page

## Future Considerations
- Admin UI for content management
- Image optimization for project images (currently uses raw URLs)
- Markdown support as alternative to HTML content
- Draft/preview functionality for pages
- Content versioning/history
