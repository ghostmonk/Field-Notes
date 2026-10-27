# Environment Setup

## Required Environment Variables

Set in `.env`:
- MongoDB connection (`MONGO_USER`, `MONGO_PASSWORD`, etc.)
- Google Cloud Storage (`GCS_BUCKET_NAME`) — production only; auth comes from Workload Identity via the Cloud Run `--service-account` (no key material in env vars)
- Service account key (`GOOGLE_APPLICATION_CREDENTIALS` file path or `GOOGLE_APPLICATION_CREDENTIALS_JSON` raw JSON) — local dev only, if targeting real GCS
- Local uploads (`LOCAL_STORAGE_PATH`) — development only, set instead of GCS vars
- Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- NextAuth (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
- Vector search (`VOYAGE_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`) — required for resume tailoring; Qdrant runs locally via Docker, Voyage AI requires an API key
- LLM pipeline (`ANTHROPIC_API_KEY`) — required for resume tailoring `/tailor` endpoint; powers job analysis, resume generation, and evaluation

`gcp-credentials.json` in the project root is a local-dev convenience for targeting real GCS. Production authenticates via Workload Identity (Cloud Run attached service account) and does not read a key file. Docker Compose sets `LOCAL_STORAGE_PATH=/app/local-uploads` automatically.

## Dev Authentication

Local development supports mock authentication without Google OAuth credentials. Docker Compose sets `ALLOW_DEV_AUTH=true` on the backend automatically. The frontend shows role-picker buttons (Admin/Commenter) instead of Google Sign-In when `NODE_ENV=development`. Dev tokens use the `dev-mock-<role>` prefix. The dev admin authenticates as `ADMIN_EMAIL` (the real admin account); the dev commenter uses `dev-commenter@dev.example.com`.

**Safety:** Two layers prevent production execution:
1. Backend rejects dev tokens unless `ALLOW_DEV_AUTH=true` (never set in deploy.yml)
2. Frontend Credentials provider only loads when `NODE_ENV=development`

## Deployment Architecture

Two Cloud Run services deployed via GitHub Actions (`.github/workflows/deploy.yml`):
- `field-notes-app` (combined frontend + backend in one container), `video-processor`
- Auto-deploys on push to main with path-based change detection
- Cloud Build for Docker images, Artifact Registry for image storage
- CI runs on PRs and non-main branches (pytest, eslint, tsc)
- Combined container: `Dockerfile` at repo root, `entrypoint.sh` runs migrations then starts both FastAPI (:5001) and Next.js (:PORT) in parallel
- `--min-instances=1` eliminates cold starts (~$2-3/month with CPU throttling)

**Environment differences:**
- Local: `LOCAL_STORAGE_PATH` for file uploads, no GCS credentials needed, containerized MongoDB, combined container via Docker Compose (mirrors production)
- Production: GCS bucket, MongoDB Atlas, Google Cloud Logging, single combined container
- `BACKEND_URL`: `http://localhost:5001` everywhere — both local Docker Compose and production (entrypoint sets it; SSR calls stay in-container)
