# Single Container Merge — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the Next.js frontend and FastAPI backend into a single Cloud Run container to eliminate sequential cold starts and cut always-warm cost to ~$2–3/month.

**Architecture:** A multi-stage Dockerfile produces one image containing both the Next.js standalone server and the FastAPI/uvicorn process. A bash entrypoint runs migrations, starts both processes, and exits if either dies. `BACKEND_URL` becomes `http://localhost:5001`. The video-processor service is unchanged.

**Tech Stack:** Docker multi-stage build, bash entrypoint (no supervisord — two processes, one script), Next.js standalone output, uvicorn, Cloud Build, Cloud Run, GitHub Actions.

---

## Task 1: Create the Combined Dockerfile

**Files:**
- Create: `Dockerfile` (repo root)

**Step 1: Write the Dockerfile**

The image needs Python 3.13 + Node.js 22, both runtimes. Multi-stage build:

- **Stage 1 (`frontend-build`)**: Node 22 base. Copy `frontend/`, install deps, run `next build`. The standalone output lands in `frontend/.next/standalone/`.
- **Stage 2 (`backend-build`)**: Python 3.13-slim. Copy `shared/python/` and `backend/`, install Python deps.
- **Stage 3 (`production`)**: Python 3.13-slim base, install Node.js 22 from NodeSource, copy artifacts from both build stages.

```dockerfile
# ---- Stage 1: Build frontend ----
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

# ---- Stage 2: Install backend deps ----
FROM python:3.13-slim AS backend-build
WORKDIR /app
COPY shared/python/ /shared/python/
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---- Stage 3: Production image ----
FROM python:3.13-slim AS production

# Install Node.js 22 (standalone server needs it)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy Python runtime
COPY --from=backend-build /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

# Copy backend source
WORKDIR /app/backend
COPY backend/ ./
COPY shared/python/ /shared/python/

# Copy frontend standalone build
WORKDIR /app/frontend
COPY --from=frontend-build /app/frontend/.next/standalone/ ./
COPY --from=frontend-build /app/frontend/.next/static ./.next/static
COPY --from=frontend-build /app/frontend/public ./public

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /app
ENV PORT=8080
EXPOSE 8080

CMD ["/app/entrypoint.sh"]
```

**Step 2: Verify the Dockerfile parses**

Run: `docker build --check -f Dockerfile .` (or just check syntax — actual build is Task 5)

**Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add combined Dockerfile for single-container deploy"
```

---

## Task 2: Create the Entrypoint Script

**Files:**
- Create: `entrypoint.sh` (repo root)

**Step 1: Write the entrypoint**

Two processes, one script. If either exits, kill the other and exit non-zero so Cloud Run restarts the container.

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${PORT:-8080}"

# --- Run migrations (backend working directory) ---
echo "[entrypoint] Running migrations..."
cd /app/backend
python -m pymongo_migrate.cli -u "${MONGO_URI:-}" -m migrations migrate || {
  echo "[entrypoint] Migration failed, starting without migration"
}

# --- Start backend ---
echo "[entrypoint] Starting FastAPI on :${BACKEND_PORT}..."
cd /app/backend
uvicorn app:app --host 0.0.0.0 --port "${BACKEND_PORT}" &
BACKEND_PID=$!

# --- Wait for backend to be ready ---
echo "[entrypoint] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
    echo "[entrypoint] Backend ready."
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "[entrypoint] Backend process died during startup."
    exit 1
  fi
  sleep 1
done

# --- Start frontend ---
echo "[entrypoint] Starting Next.js on :${FRONTEND_PORT}..."
cd /app/frontend
BACKEND_URL="http://localhost:${BACKEND_PORT}" \
HOSTNAME="0.0.0.0" \
PORT="${FRONTEND_PORT}" \
  node server.js &
FRONTEND_PID=$!

# --- Monitor both processes ---
# If either exits, kill the other and exit
wait -n $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?
echo "[entrypoint] A process exited with code ${EXIT_CODE}. Shutting down."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
wait
exit $EXIT_CODE
```

**Step 2: Verify the health endpoint exists in the backend**

Check `backend/app.py` for a `/health` route. If missing, add one:

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 3: Commit**

```bash
git add entrypoint.sh
git commit -m "feat: add entrypoint script for combined container"
```

---

## Task 3: Verify Backend Has a Health Endpoint

**Files:**
- Possibly modify: `backend/app.py`
- Test: `backend/tests/test_health.py` (if missing)

**Step 1: Check if /health exists**

Run: `grep -n 'health' backend/app.py`

If it exists, skip to Task 4. If not:

**Step 2: Write the test**

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

**Step 3: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_health.py -v`

**Step 4: Add the endpoint to app.py**

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_health.py -v`

**Step 6: Commit**

```bash
git add backend/app.py backend/tests/test_health.py
git commit -m "feat: add /health endpoint for container readiness check"
```

---

## Task 4: Create the Combined Cloud Build Config

**Files:**
- Create: `cloudbuild.yaml` (repo root)

**Step 1: Write the Cloud Build config**

This replaces both `backend/cloudbuild.yaml` and `frontend/cloudbuild.yaml`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/turbulent-app:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/turbulent-app:latest'
      - '--build-arg'
      - 'NEXT_PUBLIC_API_URL=${_NEXT_PUBLIC_API_URL}'
      - '--build-arg'
      - 'NEXT_PUBLIC_TURNSTILE_SITE_KEY=${_NEXT_PUBLIC_TURNSTILE_SITE_KEY}'
      - '-f'
      - 'Dockerfile'
      - '.'
images:
  - 'gcr.io/$PROJECT_ID/turbulent-app:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/turbulent-app:latest'
timeout: '1200s'
options:
  machineType: 'E2_HIGHCPU_8'
```

**Step 2: Commit**

```bash
git add cloudbuild.yaml
git commit -m "feat: add combined Cloud Build config"
```

---

## Task 5: Build and Test the Container Locally

**Step 1: Build the image**

Run from the repo root:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:5001 \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=test \
  -t turbulent-app:local \
  -f Dockerfile .
```

Expected: Build completes successfully.

**Step 2: Run the container with local MongoDB**

Start just mongo first:

```bash
docker compose up -d mongo
```

Then run the combined container:

```bash
docker run --rm \
  --network field-notes_default \
  -p 8080:8080 \
  -e MONGO_URI=mongodb://mongo:27017/ghostmonk \
  -e MONGO_DB_NAME=ghostmonk \
  -e BACKEND_PORT=5001 \
  -e PORT=8080 \
  -e NEXTAUTH_SECRET=test-secret \
  -e NEXTAUTH_URL=http://localhost:8080 \
  -e GOOGLE_CLIENT_ID=test \
  -e GOOGLE_CLIENT_SECRET=test \
  -e NODE_ENV=development \
  -e ALLOW_DEV_AUTH=true \
  turbulent-app:local
```

**Step 3: Verify both processes are running**

Run (in a separate terminal):

```bash
curl -s http://localhost:5001/health
# Expected: {"status":"ok"}

curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
# Expected: 200
```

**Step 4: Verify SSR calls the backend over localhost**

```bash
curl -s http://localhost:8080 | grep -o '__NEXT_DATA__' | head -1
# Expected: __NEXT_DATA__ (proves SSR ran and rendered)
```

**Step 5: Stop and clean up**

```bash
docker compose down
```

**Step 6: Commit (nothing to commit — this was a verification step)**

---

## Task 6: Update deploy.yml — Merge Backend and Frontend Deploy Jobs

**Files:**
- Modify: `.github/workflows/deploy.yml`

This is the most surgical task. The goal: replace the two separate deploy steps (backend + frontend) with one combined deploy, while keeping video-processor unchanged.

**Step 1: Update the change detection**

In the `detect-changes` job, merge the backend and frontend filters into one `app` filter:

```yaml
filters: |
  app:
    - 'backend/**'
    - 'frontend/**'
    - 'shared/python/**'
    - 'Dockerfile'
    - 'entrypoint.sh'
    - 'cloudbuild.yaml'
    - '.github/workflows/deploy*.yml'
  video-function:
    - 'cloud-functions/**'
    - 'shared/python/**'
    - '.github/workflows/deploy*.yml'
```

Update outputs to use `app` instead of `backend`/`frontend`.

**Step 2: Replace the backend and frontend deploy matrix entries with one `app` entry**

The deploy job currently uses a matrix or conditional logic for backend vs frontend. Replace with a single `app` deployment:

Cloud Build step:
```yaml
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions "_NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }},_NEXT_PUBLIC_TURNSTILE_SITE_KEY=${{ vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY }}"
```

Cloud Run deploy step:
```yaml
gcloud run deploy turbulent-app \
  --image gcr.io/${{ env.GCP_PROJECT_ID }}/turbulent-app:${{ github.sha }} \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 5 \
  --cpu-boost \
  --set-env-vars "\
MONGO_USER=${{ secrets.MONGO_USER }},\
MONGO_PASSWORD=${{ secrets.MONGO_PASSWORD }},\
MONGO_CLUSTER=${{ vars.MONGO_CLUSTER }},\
MONGO_APP_NAME=${{ vars.MONGO_APP_NAME }},\
MONGO_HOST=${{ vars.MONGO_HOST }},\
MONGO_DB_NAME=${{ vars.MONGO_DB_NAME }},\
GCS_BUCKET_NAME=${{ vars.GCS_BUCKET_NAME }},\
ADMIN_EMAIL=${{ vars.ADMIN_EMAIL }},\
GH_TOKEN=${{ secrets.GH_TOKEN }},\
GH_USERNAME=${{ vars.GH_USERNAME }},\
GOOGLE_CLIENT_ID=${{ vars.GOOGLE_CLIENT_ID }},\
GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }},\
NEXTAUTH_SECRET=${{ secrets.NEXTAUTH_SECRET }},\
NEXTAUTH_URL=${{ vars.NEXTAUTH_URL }},\
NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }},\
BACKEND_PORT=5001,\
VOYAGE_API_KEY=${{ secrets.VOYAGE_API_KEY }},\
QDRANT_URL=${{ vars.QDRANT_URL }},\
QDRANT_API_KEY=${{ secrets.QDRANT_API_KEY }},\
ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }},\
TURNSTILE_SECRET_KEY=${{ secrets.TURNSTILE_SECRET_KEY }},\
SMTP_HOST=${{ vars.SMTP_HOST }},\
SMTP_PORT=${{ vars.SMTP_PORT }},\
SMTP_USERNAME=${{ vars.SMTP_USERNAME }},\
SMTP_PASSWORD=${{ secrets.SMTP_PASSWORD }},\
SMTP_FROM_EMAIL=${{ vars.SMTP_FROM_EMAIL }},\
CONTACT_NOTIFICATION_EMAIL=${{ vars.CONTACT_NOTIFICATION_EMAIL }}"
```

Key differences from current deploy:
- `--min-instances 1` (warm instance)
- `--memory 512Mi` (not 2× since it's one container)
- No separate `BACKEND_URL` env var needed — entrypoint sets it to localhost
- All env vars from both services merged into one set

**Step 3: Remove the old Cloud Build configs**

These are no longer needed:

```bash
git rm backend/cloudbuild.yaml frontend/cloudbuild.yaml
```

**Step 4: Commit**

```bash
git add .github/workflows/deploy.yml cloudbuild.yaml
git commit -m "feat: merge backend+frontend into single Cloud Run service"
```

---

## Task 7: Update BACKEND_URL References

**Files:**
- Modify: `frontend/next.config.ts` — update the rewrites fallback
- Modify: `docker-compose.yml` — add a `combined` service profile for local testing

**Step 1: Update next.config.ts rewrites fallback**

The rewrites block has a fallback chain:

```typescript
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghostmonk.com';
```

This is fine as-is. The entrypoint sets `BACKEND_URL=http://localhost:5001` before starting Next.js. No change needed here.

**Step 2: Verify all fetchBackend calls use the env var**

Run: `grep -rn "BACKEND_URL\|fetchBackend" frontend/src/ --include='*.ts' --include='*.tsx' | head -20`

All SSR calls go through `fetchBackend()` which reads `BACKEND_URL`. No hardcoded URLs to change.

**Step 3: Commit (only if changes were needed)**

---

## Task 8: Update the CI Job

**Files:**
- Modify: `.github/workflows/deploy.yml` — the CI job that runs on PRs

**Step 1: Check current CI configuration**

The CI job runs pytest, eslint, and tsc. These don't depend on the container architecture and should not need changes. Verify:

Run: `grep -A 30 'ci:' .github/workflows/deploy.yml` or the relevant CI section.

**Step 2: If CI builds Docker images for testing, update to use the new Dockerfile**

Most likely CI just runs lint/test directly, not via Docker. Confirm and move on.

**Step 3: Commit (only if changes were needed)**

---

## Task 9: Update CLAUDE.md and Documentation

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs-site/pages/plans/2026-10-25-single-container-merge.md` (this file)

**Step 1: Update CLAUDE.md deployment section**

Replace the three-service deployment description with:

```markdown
## Deployment Architecture

Two Cloud Run services deployed via GitHub Actions (`.github/workflows/deploy.yml`):
- `turbulent-app` (combined frontend + backend), `video-processor`
- Auto-deploys on push to main with path-based change detection
- Cloud Build for Docker images, GCR for image registry
- CI runs on PRs and non-main branches (pytest, eslint, tsc)
- Combined container runs Next.js standalone + FastAPI/uvicorn via entrypoint.sh
- `BACKEND_URL` is `http://localhost:5001` inside the container (set by entrypoint)
- min-instances=1 for zero cold starts (~$2-3/month idle cost)
```

Update the environment differences section:

```markdown
**Environment differences:**
- Local: `make dev-local` runs backend+mongo in Docker, frontend locally (unchanged)
- Production: Single container on Cloud Run, GCS bucket, MongoDB Atlas, Google Cloud Logging
- `BACKEND_URL`: Docker dev = `http://backend:5001`, local frontend = `http://localhost:5001`, production = `http://localhost:5001` (same container)
```

**Step 2: Commit**

```bash
git add CLAUDE.md docs-site/pages/plans/2026-10-25-single-container-merge.md
git commit -m "docs: update architecture docs for single-container deploy"
```

---

## Task 10: Deploy and Verify

**Step 1: Push the branch and create a draft PR**

```bash
git push -u origin ghostmonk/single-container-merge
gh pr create --draft \
  --title "feat: merge frontend+backend into single Cloud Run container" \
  --body "Merges the Next.js frontend and FastAPI backend into one Cloud Run container.

- Eliminates sequential cold starts (5-8s → 3-5s with scale-to-zero, 0s with min=1)
- Reduces always-warm cost from ~$25-30/mo to ~$2-3/mo
- SSR calls traverse localhost instead of cross-service network hop
- Single connection pool to MongoDB Atlas
- Video processor unchanged (stays separate)

## Changes
- New root Dockerfile (multi-stage: node build → python build → combined runtime)
- New entrypoint.sh (starts both processes, monitors health)
- New root cloudbuild.yaml (replaces backend/ and frontend/ configs)
- Updated deploy.yml (one service instead of two)
- Removed backend/cloudbuild.yaml, frontend/cloudbuild.yaml"
```

**Step 2: After CI passes, merge and monitor the deploy**

Watch the deploy:

```bash
gh run list --workflow deploy.yml --limit 1
gh run watch <run-id>
```

**Step 3: Verify production**

```bash
# Homepage loads
curl -s -w "TTFB: %{time_starttransfer}s\nHTTP %{http_code}\n" -o /dev/null https://ghostmonk.com/

# Backend health
curl -s https://ghostmonk.com/api/sections

# GitHub contributions (already fixed)
curl -s https://ghostmonk.com/api/github/contributions | head -c 100
```

**Step 4: Set min-instances=1**

```bash
gcloud run services update turbulent-app --region us-central1 --min-instances 1
```

**Step 5: Verify warm performance**

Wait 20+ minutes (past the old idle timeout), then:

```bash
curl -s -w "TTFB: %{time_starttransfer}s\n" -o /dev/null https://ghostmonk.com/
# Expected: < 500ms (no cold start)
```

**Step 6: Delete old services**

Only after confirming production is stable for at least a day:

```bash
gcloud run services delete turbulent-frontend --region us-central1
gcloud run services delete turbulent-service --region us-central1
```

---

## Task 11: Clean Up Old GitHub Variables

**Step 1: Check which vars are no longer needed**

The `BACKEND_URL` GitHub Actions variable was used to tell the frontend where the backend lives. In the merged container, the entrypoint handles this. Remove it:

```bash
gh variable delete BACKEND_URL -R ghostmonk/Field-Notes
```

**Step 2: Verify no workflow references remain**

Run: `grep -n 'BACKEND_URL' .github/workflows/deploy.yml`

Should only appear in the video-processor section (if it uses it) or not at all.

**Step 3: Commit (nothing to commit — this is a GitHub-side cleanup)**

---

## Rollback Plan

If the combined container fails in production:

1. Revert the deploy.yml change (restores separate backend+frontend deploys)
2. Push to main — the old Dockerfiles and cloudbuild configs still exist in git history
3. Or: manually trigger a deploy of the previous image tags via `gcloud run deploy`

The old services (`turbulent-frontend`, `turbulent-service`) still exist until Task 10 Step 6 explicitly deletes them. Until then, rolling back is a config revert, not a rebuild.
