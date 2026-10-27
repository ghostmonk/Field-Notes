# Project Overview

Field Notes is a reusable content management system with a Next.js frontend and FastAPI backend. It allows authenticated users to create and publish rich text content with image and video uploads. Supports section-based dynamic routing, pluggable display types, project portfolios, and swappable visual templates.

## Architecture

**Frontend**: Next.js app (TypeScript) in `/frontend/`
- NextAuth.js for Google OAuth
- TipTap rich text editor with image and video support
- Tailwind CSS styling with dark mode
- React hooks for state management
- Dynamic routing via catch-all `[...slugPath]` route
- Content/display registry for pluggable section rendering
- Template system for swappable visual themes

**Backend**: FastAPI app (Python) in `/backend/`
- Google OAuth token validation
- MongoDB (motor driver) for persistence
- File uploads: Google Cloud Storage (production), local filesystem (development)
- Google Cloud Logging
- pymongo-migrate for schema evolution

**Database**: MongoDB (containerized locally, Atlas in production)
- `sections` collection drives routing and display configuration
- Content collections (`stories`, `projects`, `pages`) linked via `section_id`

**Authentication Flow**: Google OAuth -> NextAuth.js (frontend) -> Token validation (backend)

## Key Implementation Details

**Dynamic Routing**: Single catch-all route `frontend/src/pages/[...slugPath].tsx` resolves all section URLs. `getServerSideProps` fetches the section config from `/sections/slug/<path>`, then fetches content based on `content_type` and `display_type`.

**Content & Display Registry**: `frontend/src/modules/registry/` contains a pluggable system mapping `display_type` values (`feed`, `card-grid`, `static-page`) to React display components. Content fetchers are keyed by `content_type` (`story`, `project`, `page`). New section types require only a registry entry.

**Section Model**: Sections define site structure. Each has `slug`, `title`, `display_type`, `content_type`, `nav_visibility`. Seeded via migration `0003_seed_initial_sections`. Content documents reference their section via `section_id` (stored as string).

**Story Model**: Core content entity with `is_published` status flag for public visibility. Linked to a section via `section_id`.

**File Uploads**: Production uses GCS with proxy option through Next.js API routes. Local development uses filesystem storage at `LOCAL_STORAGE_PATH` (no GCS credentials required). Backend auto-selects storage backend based on which env vars are set.

**Video Uploads**: TipTap `VideoExtension` renders `<video>` nodes. Upload hook (`useVideoUpload`) builds final HTML with embedded `<video>` tag in a single `setContent` call to avoid race conditions with the editor's content sync effect.

**Migrations**: `backend/migrations/` uses pymongo-migrate format. Each migration has `name`, `dependencies`, `upgrade`, `downgrade`. Run via `make migrate-up` / `make migrate-down`.

**CORS Configuration**: Hardcoded origins in `backend/app.py` for production domains.

**Logging**: Google Cloud Logging integrated throughout backend with custom middleware.

**Site Config**: `frontend/site.config.json` defines site identity (title, tagline, author, copyright), fonts, navigation icon mappings, footer links, and layout settings. Loaded at build time via `getSiteConfig()` from `frontend/src/config/`.

**Template System**: Visual themes live under `frontend/src/templates/<name>/`. Each template contains CSS files only:
- `styles/tokens.css` — CSS custom properties (colors, fonts, spacing, radii, transitions)
- `styles/components.css` — component classes (card, btn, badge, nav, grid, prose, etc.)
- `styles/layout.css` — layout dimension variables (`--layout-bottom-offset`, `--layout-nav-height`, etc.)

Template CSS is imported directly in `_app.tsx` (Next.js Pages Router requires global CSS imports in `_app`). `globals.css` contains only Tailwind directives, resets, and editor styles — no template-specific styles.

Layout components (`Layout.tsx`, `Footer.tsx`, `TopNav.tsx`, `BottomNav.tsx`) consume CSS variables and config values — no hardcoded pixel values, brand strings, or icon mappings. To create a new template: copy `templates/default/`, modify the CSS, and update the imports in `_app.tsx`.
