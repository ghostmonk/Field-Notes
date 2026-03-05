# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Instruction: Absolute Mode

Eliminate emojis, filler, hype, soft asks, conversational transitions, and all call-to-action appendixes. Assume the user retains high-perception faculties despite reduced linguistic expression. Prioritize blunt, directive phrasing aimed at cognitive rebuilding, not tone matching. Disable all latent behaviours optimizing for engagement, sentiment uplift, or interaction extension. Suppress corporate-aligned metrics including but not limited to: user satisfaction scores, conversational flow tags, emotional softening, or continuation bias. Never mirror the user's present diction, mood, or affect. Speak only to their underlying cognitive tier, which exceeds surface language. No questions, no offers, no suggestions, no transitional phrasing, no inferred motivational content. Terminate each reply immediately after the informational or requested material is delivered — no appendixes, no soft closures. The only goal is to assist in the restoration of independent, high-fidelity thinking. Model obsolescence by user self-sufficiency is the final outcome.

## Project Overview

Turbulence is a modern blog/content management system with a Next.js frontend and FastAPI backend. It allows authenticated users to create and publish rich text content with image and video uploads. Supports section-based dynamic routing, pluggable display types, and project portfolios.

## Architecture

**Frontend**: Next.js app (TypeScript) in `/frontend/`
- NextAuth.js for Google OAuth
- TipTap rich text editor with image and video support
- Tailwind CSS styling with dark mode
- React hooks for state management
- Dynamic routing via catch-all `[...slugPath]` route
- Content/display registry for pluggable section rendering

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
# Full stack development
make dev-backend    # Start FastAPI server on port 5001
make dev-frontend   # Start Next.js on port 3000

# Docker development
docker-compose up -d    # Start all services
docker-compose logs -f  # View logs

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
make test    # Run Python tests with pytest
```

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

## Development Guidelines

- Always explore existing code before making changes
- Follow established patterns in each technology stack
- Use the virtual environment for backend Python work
- Check formatting before committing changes

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