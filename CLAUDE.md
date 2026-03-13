# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Instruction: Absolute Mode

Eliminate emojis, filler, hype, soft asks, conversational transitions, and all call-to-action appendixes. Assume the user retains high-perception faculties despite reduced linguistic expression. Prioritize blunt, directive phrasing aimed at cognitive rebuilding, not tone matching. Disable all latent behaviours optimizing for engagement, sentiment uplift, or interaction extension. Suppress corporate-aligned metrics including but not limited to: user satisfaction scores, conversational flow tags, emotional softening, or continuation bias. Never mirror the user's present diction, mood, or affect. Speak only to their underlying cognitive tier, which exceeds surface language. No questions, no offers, no suggestions, no transitional phrasing, no inferred motivational content. Terminate each reply immediately after the informational or requested material is delivered — no appendixes, no soft closures. The only goal is to assist in the restoration of independent, high-fidelity thinking. Model obsolescence by user self-sufficiency is the final outcome.

## Project Overview

Field Notes is a reusable content management system with a Next.js frontend and FastAPI backend. It allows authenticated users to create and publish rich text content with image and video uploads. Supports section-based dynamic routing, pluggable display types, project portfolios, and swappable visual templates.

## Architecture

**Frontend**: Next.js app (TypeScript) in `/frontend/`
- NextAuth.js for Google OAuth
- TipTap rich text editor with image and video support
- Tailwind CSS styling with dark mode
- React hooks for state management
- Dynamic routing via catch-all `[...slugPath]` route
- Content/display registry for pluggable section rendering
- Template system for swappable visual themes (see Template System below)

**Backend**: FastAPI app (Python) in `/backend/`
- Google OAuth token validation
- MongoDB (motor driver) for persistence
- File uploads: Google Cloud Storage (production), local filesystem (development)
- Google Cloud Logging
- pymongo-migrate for schema evolution

**Database**: MongoDB (containerized locally, Atlas in production)
- `sections` collection drives routing and display configuration
- Content collections (`stories`, `projects`, `pages`) linked via `section_id`

**Authentication Flow**: Google OAuth → NextAuth.js (frontend) → Token validation (backend)

## Essential Commands

### Development
```bash
# Recommended: Docker backend/mongo + local frontend (hot reload, no rebuild)
make dev-local          # Start backend/mongo in Docker, frontend locally

# Full stack in Docker (slower, requires rebuild for frontend changes)
make dev                # Build + migrate + start all services

# Individual services
make dev-backend        # Start FastAPI server on port 5001
make dev-frontend       # Start Next.js on port 3000

# Virtual environment (backend)
make venv              # Create/update Python venv
source ~/Documents/venvs/field-notes/bin/activate  # Activate venv
```

### Code Quality
```bash
# Backend formatting
make format           # Format Python with black/isort + ESLint frontend
make format-check     # Check formatting only

# Frontend linting
cd frontend && npm run lint
```

### Testing
```bash
make test                # Run Python tests with pytest
make test-frontend-unit  # Run frontend unit tests with vitest
make test-frontend       # Run Playwright e2e tests (headless)
make test-frontend-ui    # Run Playwright e2e tests (interactive UI)
```

**E2E test prerequisites**: Stop the Docker frontend before running e2e tests (`docker compose stop frontend`). Playwright starts its own Next.js dev server with `BACKEND_URL` pointing to a mock Express server on port 5555. If Docker's frontend is running on port 3000, Playwright's `reuseExistingServer` will connect to it instead, causing SSR to hit the real backend rather than test data.

**E2E architecture**: Two-layer mocking — an Express mock server (`frontend/e2e/mock-server.ts`) handles SSR requests from `getServerSideProps`, and Playwright `page.route()` fixtures handle client-side API calls. Both use shared test data from `frontend/e2e/test-data.ts`.

**Adding e2e tests**:
- Specs go in `frontend/e2e/specs/<category>/` (e.g., `smoke/`, `stories/`, `editor/`)
- Page objects go in `frontend/e2e/page-objects/`, extending `BasePage` from `base.page.ts`
- Component objects go in `frontend/e2e/page-objects/components/`
- Import fixtures from `../../fixtures` — use `mockApiPage` (unauthenticated) or `mockAuthenticatedApiPage` (admin session)
- All elements targeted via `data-testid` attributes
- New mock endpoints go in both `mock-server.ts` (SSR) and `api-mock.fixture.ts` (client-side)
- Test data constants and factories go in `test-data.ts`

## Environment Setup

Required environment variables in `.env`:
- MongoDB connection (`MONGO_USER`, `MONGO_PASSWORD`, etc.)
- Google Cloud Storage (`GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`) — production only
- Local uploads (`LOCAL_STORAGE_PATH`) — development only, set instead of GCS vars
- Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- NextAuth (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

Place `gcp-credentials.json` in project root (production only). Docker Compose sets `LOCAL_STORAGE_PATH=/app/local-uploads` automatically.

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

## Development Guidelines

- Always explore existing code before making changes
- Follow established patterns in each technology stack
- Use the virtual environment for backend Python work
- Check formatting before committing changes
- **New features must include docs-site updates** — add or update pages under `docs-site/pages/` (guides, architecture, features, or releases as appropriate). The docs site auto-deploys to GitHub Pages on push to main when `docs-site/` files change.
- **Design plans** go in `docs-site/pages/plans/` with filename format `YYYY-MM-DD-<topic>.md`. Update `_meta.ts` in the same directory when adding a new plan.

### Worktree Discipline

Assume all work happens in a worktree unless the user explicitly says to work on main.

- **Worktree location**: `.worktrees/<descriptive-name>` (e.g., `.worktrees/video-upload-fix`)
- **Branch naming**: `ghostmonk/{issue#}_descriptive_title` when an issue exists, `ghostmonk/descriptive_title` otherwise (e.g., `ghostmonk/142_video-upload-fix`, `ghostmonk/development-optimization`)
- **Setup**: symlink `.env` from main repo, run `cd frontend && npm install`
- **Port isolation**: When running multiple worktrees simultaneously, create `.env.local` in the worktree with offset ports to avoid conflicts:
  ```
  FRONTEND_PORT=3010
  BACKEND_PORT=5011
  MONGO_PORT=27027
  ```
  The Makefile and `docker-compose.yml` read these variables (defaults: 3000, 5001, 27017). Each worktree's Docker Compose project is already namespaced by directory name, so container names won't conflict — but host ports will unless offset.
- **Dev testing**: use `make dev-local` or `make dev` to start services — don't run commands manually
- **Cleanup**: run `make down` in the worktree to stop all Docker containers before removing the worktree with `git worktree remove`

### Squash Merge Commit Messages

When squash-merging a PR via `gh pr merge --squash`, the `--body` becomes the commit message in git history. Keep it tight:
- One-line summary as `--subject` (under 72 chars)
- Body: 3-8 bullet points covering what changed and why, no headers/sections/markdown formatting
- No test plan, no checkboxes, no "Generated with" footers
- The PR description (visible on GitHub) can be detailed; the commit message must be concise

### Formatting Rules

`make format` is mandatory before every commit — CI rejects unformatted code.
- Backend: black + isort + flake8
- Frontend: eslint --fix

### Debugging Protocol

- Before proposing any fix: read the actual error message, trace the call path from entry point to failure, identify the root cause. State the root cause explicitly before writing code.
- Never apply speculative fixes. If the cause is unclear, add logging or reproduce the issue first.
- Maximum one fix attempt per hypothesis. If it doesn't work, the hypothesis was wrong — re-investigate, don't iterate on the same guess.

### Completion Checklist

Before declaring work done:
- If a backend endpoint changed: check all frontend callers
- If a data model changed: check migrations, API serialization, and frontend types
- If CSS/template variables changed: verify both light and dark mode
- Run `make format` and `make test`
- If the change affects deployment (new env vars, new dependencies, Dockerfile changes): update `deploy.yml` and document the new vars

## Deployment Architecture

Three Cloud Run services deployed via GitHub Actions (`.github/workflows/deploy.yml`):
- `turbulent-service` (backend), `turbulent-frontend`, `video-processor`
- Auto-deploys on push to main with path-based change detection
- Cloud Build for Docker images, GCR for image registry
- CI runs on PRs and non-main branches (pytest, eslint, tsc)
- Service names still use "turbulent" prefix in GCP

**Environment differences:**
- Local: `LOCAL_STORAGE_PATH` for file uploads, no GCS credentials needed, containerized MongoDB
- Production: GCS bucket, MongoDB Atlas, Google Cloud Logging
- `BACKEND_URL`: Docker = `http://backend:5001`, local frontend = `http://localhost:5001`, production = Cloud Run backend URL

## Security Requirements

### XSS Protection
- **Store raw user input** in the database (no HTML escaping on backend)
- **Rely on React's auto-escaping** for XSS protection - React escapes content automatically when rendered via `{content}`
- **Never use `dangerouslySetInnerHTML`** with user-generated content
- **Do NOT double-encode**: Backend escaping + frontend decoding creates bugs when users enter literal entities like `&lt;`

### Input Validation
- Never trust client-side validation alone - validate on the backend
- Use parameterized queries for database operations (MongoDB driver handles this)
- Never construct queries with string concatenation

### Authentication & Rate Limiting
- Authenticate and authorize all mutation endpoints
- Rate limit all mutation endpoints to human-realistic rates (e.g., 5-10 requests/minute for user actions like comments, reactions)