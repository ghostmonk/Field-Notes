# Development Process Optimization

## Problem

Three recurring time sinks when using LLMs to develop Field Notes:

1. **Shallow debugging** -- fix attempts without root cause analysis, leading to churn
2. **Incomplete implementations** -- missed connected pieces discovered after "done"
3. **Lost operational context** -- GCP deployment, formatting requirements, and environment-specific behavior need re-explaining each session

Root cause: the LLM starts each session with architectural knowledge (CLAUDE.md) but lacks operational knowledge, deployment awareness, and enforced discipline around completeness.

## Changes

Five changes, in implementation order:

### 1. CLAUDE.md Operational Context

Add a new section covering what gets forgotten between sessions.

**Deployment Architecture:**
- Three Cloud Run services: `turbulent-service` (backend), `turbulent-frontend`, `video-processor`
- Auto-deploys on push to main via `.github/workflows/deploy.yml`
- Path-based change detection -- only deploys services with changed files
- Cloud Build for Docker image builds, GCR for image registry
- CI runs on PRs and non-main branches (pytest, eslint, tsc)
- Service names still use "turbulent" prefix in GCP -- renaming requires coordinated deploy config + GCP console changes

**Formatting Rules:**
- `make format` is mandatory before committing -- CI will reject unformatted code
- Backend: black + isort + flake8
- Frontend: eslint --fix
- Never commit without running this

**Environment Differences:**
- Local: `LOCAL_STORAGE_PATH` for file uploads, no GCS credentials needed
- Production: GCS bucket, MongoDB Atlas (not local mongo), Google Cloud Logging
- `BACKEND_URL` differs: Docker uses `http://backend:5001`, local frontend uses `http://localhost:5001`, production uses the Cloud Run backend URL

### 2. CLAUDE.md Workflow Enforcement

Rules the LLM must follow -- not suggestions.

**Debugging Protocol:**
- Before proposing any fix: read the actual error message, trace the call path from entry point to failure, identify the root cause. State the root cause explicitly before writing code.
- Never apply speculative fixes. If the cause is unclear, add logging or reproduce the issue first.
- Maximum one fix attempt per hypothesis. If it doesn't work, the hypothesis was wrong -- re-investigate, don't iterate on the same guess.

**Completion Checklist (before declaring work done):**
- If a backend endpoint changed: check all frontend callers
- If a data model changed: check migrations, API serialization, and frontend types
- If CSS/template variables changed: verify both light and dark mode
- Run `make format` and `make test`
- If the change affects deployment (new env vars, new dependencies, Dockerfile changes): update deploy.yml and document the new vars

**Skill Enforcement:**
- On any bug or test failure: use `systematic-debugging` skill before proposing fixes
- Before claiming work is complete: use `verification-before-completion` skill
- Before committing: run `make format` -- no exceptions

**Worktree Discipline:**
- Assume all work happens in a worktree under `.worktrees/` unless the user explicitly says to work on main
- Worktree directory name: descriptive title (e.g., `development-optimization`, `video-upload-fix`)
- Branch name: `ghostmonk/{issue#}_descriptive_title` when an issue exists, `ghostmonk/descriptive_title` otherwise (e.g., `ghostmonk/142_video-upload-fix`, `ghostmonk/development-optimization`)
- Use `make dev-local` or `make dev` to start services for testing -- don't run commands manually
- Symlink `.env` from the main repo into the worktree
- Install frontend dependencies separately (`cd frontend && npm install`)
- Before removing a worktree: run `make down` to stop all Docker containers first, then `git worktree remove`

### 3. Turbopack Re-enablement

Current state: every `next dev` and `next build` command forces `--webpack` due to a Turbopack + PostCSS/Tailwind v4 hang in Next.js 16.

**Test plan:**
1. Remove `--webpack` flag from one command (`dev` script in package.json)
2. Run `next dev` without it
3. Verify: pages load, Tailwind classes render, hot reload works on CSS and TSX changes
4. If it works: remove `--webpack` from all scripts (dev, dev:docker, build)
5. If it still hangs: pin the issue to the specific interaction and leave `--webpack` with an updated comment noting the version tested

**Affected files:**
- `frontend/package.json` -- 4 scripts use `--webpack`
- `Makefile` line 210 -- `dev-frontend` target passes `--webpack`
- `CLAUDE.md` -- remove the Turbopack note or update it

### 4. Vitest Setup

Current frontend testing: ESLint + Playwright e2e only. No unit tests.

**What to add:**
- Vitest + React Testing Library
- Target: utility functions, hooks, and registry logic
- Not targeting: page components or visual rendering (Playwright covers those)

**High-value test targets:**
- `frontend/src/modules/registry/` -- content fetchers and display type resolution
- Custom hooks (video upload, auth, content fetching)
- Pure utility functions
- `getSiteConfig()` and template CSS variable resolution

**Setup:**
- `vitest` + `@testing-library/react` + `jsdom` environment
- Config in `frontend/vitest.config.ts`
- `npm run test:unit` script in package.json
- Add `make test-frontend-unit` to Makefile

**What NOT to do:**
- Don't backfill tests for every existing component
- Don't duplicate what Playwright already covers
- Don't test React rendering of simple display components

### 5. CI Pipeline Tightening

**Add to the frontend CI job:**
- Frontend unit tests (vitest)
- Frontend build verification (`next build`) -- catches SSR/build errors that eslint and tsc miss
- Frontend formatting gate

**Frontend CI job sequence:**
1. `npm ci`
2. `npm run lint` (exists)
3. `npx tsc --noEmit` (exists)
4. `npm run test:unit` (new)
5. `npm run build` (new)

**Why build verification matters:** Next.js Pages Router with `getServerSideProps` can have runtime import errors, missing env var references, or SSR-incompatible code that tsc and eslint don't catch.

**Not changing:** deploy pipeline or backend CI.

**Affected files:**
- `.github/workflows/ci.yml` -- add vitest and build steps
- Rename `frontend-lint` job to `frontend`

## Implementation Order

1. CLAUDE.md updates (items 1-2) -- immediate effect, no code changes
2. Turbopack test (item 3) -- quick, isolated, fully reversible
3. Vitest setup (item 4) -- new tooling
4. CI tightening (item 5) -- depends on vitest being in place
