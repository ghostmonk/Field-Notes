# Frontend Architecture Conventions

## Server/Client Boundary

- SSR and API routes use `BACKEND_URL` (Docker-internal). Client components use `NEXT_PUBLIC_API_URL` (publicly reachable). Never cross these — use `getBackendUrl()` from `@/shared/utils/backend-fetch` instead of reading env vars directly.
- Server-side backend calls use `fetchBackend()` — never raw `fetch()` with a hardcoded or env-var-composed URL. `fetchBackend()` handles URL resolution and request timeouts.
- `cheerio` is server-only. It's aliased to empty in the client bundle via `next.config.ts`. Importing it in client-side code produces a silently broken module at runtime with no build error.

## API Routes

API routes (`frontend/src/pages/api/`) are thin proxies. Extract auth from session, forward to backend via `fetchBackend()`, return response. No business logic, no data transformation, no database access.

## Data Fetching

Client-side data fetching goes through `apiClient` (`@/shared/utils/apiClient`). Never call `fetch('/api/...')` directly from hooks or components. `apiClient` provides structured error handling, auth headers, and query serialization.

## Module Boundaries

Cross-module imports go through barrel files. Import from `@/modules/stories`, not `@/modules/stories/components/StoryCard`. Files within the same module may import siblings directly.

## Section Icons

Use `iconMap[section.icon]` from `@/shared/lib/navIcons` to render section icons. Don't import icon components directly from `react-icons/hi` for section navigation. Use the `SectionIcon` type for icon fields.
