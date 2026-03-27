<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: server-backend-fetch
title: Server-side backend requests must use fetchBackend()
severity: error
globs:
  - frontend/src/pages/api/**/*.ts
  - frontend/src/rendering/**/*.ts
tags:
  - architecture
  - api
  - server-side
---

All server-side HTTP requests to the backend must go through `fetchBackend()` from `@/shared/utils/backend-fetch`. Never call `fetch()` directly with a hardcoded or env-var-composed URL in API routes.

`fetchBackend()` handles:
- URL resolution via `getBackendUrl()` (which reads `BACKEND_URL` for Docker, `NEXT_PUBLIC_API_URL` for local)
- A 10-second `AbortSignal.timeout` on every request

Flag any pattern in `src/pages/api/**` or `src/rendering/**` that calls `fetch(process.env.BACKEND_URL + ...)`, `fetch(process.env.NEXT_PUBLIC_API_URL + ...)`, or `fetch('http://backend:...')` directly.

Compliant: `await fetchBackend('/stories', { headers: { Authorization: ... } })`
Violation: `await fetch(\`${process.env.BACKEND_URL}/stories\`)`

### Violations

```
const res = await fetch(`${process.env.BACKEND_URL}/api/stories`);
```

```
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stories/${id}`);
```

### Compliant

```
const res = await fetchBackend(`/stories/${id}`, { headers: { Authorization: `Bearer ${token}` } });
```

```
const res = await fetchBackend('/stories', init);
```
