# Git Workflows

## Worktree Discipline

Assume all work happens in a worktree unless explicitly told to work on main.

- **Worktree location**: `.worktrees/<descriptive-name>` (e.g., `.worktrees/video-upload-fix`)
- **Branch naming**: `ghostmonk/{issue#}_descriptive_title` when an issue exists, `ghostmonk/descriptive_title` otherwise (e.g., `ghostmonk/142_video-upload-fix`, `ghostmonk/development-optimization`)
- **Setup**: symlink `.env` and `gcp-credentials.json` from main repo (also symlink `gcp-credentials.json` into `backend/` — migrations run from that cwd). `cd frontend && npm install` only needed for running tests locally; `make dev-local` builds the Docker image.
- **Port isolation**: When running multiple worktrees simultaneously, create `.env.local` in the worktree with offset ports to avoid conflicts:
  ```
  FRONTEND_PORT=3010
  BACKEND_PORT=5011
  MONGO_PORT=27027
  QDRANT_PORT=6343
  ```
  The Makefile and `docker-compose.yml` read these variables (defaults: 3000, 5001, 27017, 6333). Each worktree's Docker Compose project is already namespaced by directory name, so container names won't conflict — but host ports will unless offset.
- **Dev testing**: use `make dev-local` or `make dev` to start services — don't run commands manually
- **Cleanup**: run `make down` in the worktree to stop all Docker containers before removing the worktree with `git worktree remove`

## Pull Request Creation

Always create PRs in **draft mode** (`gh pr create --draft`). The code review bot only triggers on `ready_for_review`, so draft PRs avoid unnecessary review cycles and token burn. Mark as ready for review only when the work is complete and tests pass.

## Squash Merge Commit Messages

When squash-merging a PR via `gh pr merge --squash`, the `--body` becomes the commit message in git history. Keep it tight:
- One-line summary as `--subject` (under 72 chars)
- Body: 3-8 bullet points covering what changed and why, no headers/sections/markdown formatting
- No test plan, no checkboxes, no "Generated with" footers
- The PR description (visible on GitHub) can be detailed; the commit message must be concise

## Release Process

When told to "release", "ship", or "merge" a PR, execute this sequence:

1. **Run all tests**:
   - `make test` (backend pytest)
   - `make test-frontend-unit` (vitest)
   - `make test-frontend` (Playwright e2e — stop Docker frontend first: `docker compose stop frontend`)
   - `make format`
   - Fix any failures before proceeding.

2. **PR review loop** — follow the PR Review Loop procedure until converged.

3. **Check CI** — `gh pr checks <PR#>`. All checks must pass. If CI fails, investigate and fix.

4. **Update review findings** — add/update the entry in `docs-site/data/review-findings.json` with final round counts, categories, and notes. Commit to main.

5. **Write release notes** — add `docs-site/pages/releases/YYYY-MM-DD--<topic>.md` with: what changed, why, migration steps. Update `_meta.ts`. Commit to the PR branch.

6. **Squash merge** — `gh pr merge --squash --subject "<summary> (#N)" --body "<3-8 bullets>"`. Follow squash merge commit message rules above.

7. **Post-merge cleanup**:
   - Close related issues
   - Delete any GitHub variables/secrets that are no longer needed
   - `make down` in the worktree, then `git worktree remove`
