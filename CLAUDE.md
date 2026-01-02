# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turbulence is a modern blog/content management system with a Next.js frontend and FastAPI backend. It allows authenticated users to create and publish rich text content with image uploads via Google Cloud Storage.

## Architecture

**Frontend**: Next.js app (TypeScript) in `/frontend/`
- NextAuth.js for Google OAuth
- TipTap rich text editor with image support
- Tailwind CSS styling
- React hooks for state management

**Backend**: FastAPI app (Python) in `/backend/`
- Google OAuth token validation
- MongoDB (motor driver) for persistence
- Google Cloud Storage for image uploads
- Google Cloud Logging

**Database**: MongoDB (containerized locally, Atlas in production)

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
source ~/Documents/venvs/turbulence/bin/activate  # Activate venv
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
- Google Cloud Storage (`GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS`)
- Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- NextAuth (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

Place `gcp-credentials.json` in project root.

## Key Implementation Details

**Story Model**: Core content entity with `published` status flag for public visibility
**Image Uploads**: Via GCS with proxy option through Next.js API routes
**CORS Configuration**: Hardcoded origins in `backend/app.py` for production domains
**Logging**: Google Cloud Logging integrated throughout backend with custom middleware

## Development Guidelines

- Always explore existing code before making changes
- Follow established patterns in each technology stack
- Use the virtual environment for backend Python work
- Check formatting before committing changes

## Security Requirements

- Always sanitize user input before storing (use `html.escape()` for text content in Python)
- Never trust client-side validation alone - validate and sanitize on the backend
- Escape user-generated content that will be displayed (React does this by default, but be careful with `dangerouslySetInnerHTML`)
- Use parameterized queries for database operations (MongoDB driver handles this, but never construct queries with string concatenation)
- Authenticate and authorize all mutation endpoints
- Rate limit all mutation endpoints to human-realistic rates (e.g., 5-10 requests/minute for user actions like comments, reactions)