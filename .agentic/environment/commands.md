# Essential Commands

## Development

```bash
# Combined container (mirrors production) + Docker mongo/qdrant
make dev-local          # Build + start combined app container, mongo, qdrant
make dev                # Alias for dev-local

# Virtual environment (backend, for running tests and formatting)
make venv              # Create/update Python venv
source ~/Documents/venvs/field-notes/bin/activate  # Activate venv
```

## Code Quality

```bash
# Backend formatting
make format           # Format Python with black/isort + ESLint frontend
make format-check     # Check formatting only

# Frontend linting
cd frontend && npm run lint
```

## Testing

```bash
make test                # Run Python tests with pytest
make test-frontend-unit  # Run frontend unit tests with vitest
make test-frontend       # Run Playwright e2e tests (headless)
make test-frontend-ui    # Run Playwright e2e tests (interactive UI)
```

**E2E test prerequisites**: Stop the Docker app container before running e2e tests (`docker compose stop app`). Playwright starts its own Next.js dev server with `BACKEND_URL` pointing to a mock Express server on port 5555. If the Docker app is running on port 3000, Playwright's `reuseExistingServer` will connect to it instead, causing SSR to hit the real backend rather than test data.

**E2E architecture**: Two-layer mocking — an Express mock server (`frontend/e2e/mock-server.ts`) handles SSR requests from `getServerSideProps`, and Playwright `page.route()` fixtures handle client-side API calls. Both use shared test data from `frontend/e2e/test-data.ts`.

**Adding e2e tests**:
- Specs go in `frontend/e2e/specs/<category>/` (e.g., `smoke/`, `stories/`, `editor/`)
- Page objects go in `frontend/e2e/page-objects/`, extending `BasePage` from `base.page.ts`
- Component objects go in `frontend/e2e/page-objects/components/`
- Import fixtures from `../../fixtures` — use `mockApiPage` (unauthenticated) or `mockAuthenticatedApiPage` (admin session)
- All elements targeted via `data-testid` attributes
- New mock endpoints go in both `mock-server.ts` (SSR) and `api-mock.fixture.ts` (client-side)
- Test data constants and factories go in `test-data.ts`
