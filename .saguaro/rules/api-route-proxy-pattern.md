<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: api-route-proxy-pattern
title: Next.js API routes must proxy to the backend via fetchBackend, not expose business logic
severity: warning
globs:
  - frontend/src/pages/api/**/*.ts
tags:
  - architecture
  - api-routes
  - proxy
---

Next.js API routes in `src/pages/api/` are thin proxies. They must:
1. Extract auth token from the session (via `getServerSession`)
2. Forward the request to the backend using `fetchBackend()`
3. Return the backend response to the client

API routes must not contain business logic, data transformation, or database access. They exist to:
- Add the auth `Authorization` header that the browser cannot set directly
- Keep `BACKEND_URL` (Docker-internal) secret from the browser
- Optionally rewrite paths or merge query params

Flag: API routes that contain conditional logic beyond session extraction, error normalization, or path construction.

### Violations

```
// API route that filters results itself instead of passing params to backend
export default async function handler(req, res) {
  const stories = await fetchBackend('/stories');
  const filtered = stories.filter(s => s.section_id === req.query.section);
  res.json(filtered);
}
```

### Compliant

```
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const backendRes = await fetchBackend(`/stories?section_id=${req.query.section}`, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });
  res.status(backendRes.status).json(await backendRes.json());
}
```
