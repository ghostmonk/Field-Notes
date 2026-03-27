<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: client-api-client
title: Client-side data fetching must go through apiClient
severity: warning
globs:
  - frontend/src/modules/**/*.ts
  - frontend/src/modules/**/*.tsx
  - frontend/src/hooks/**/*.ts
  - frontend/src/components/**/*.tsx
tags:
  - architecture
  - api
  - client-side
---

Client-side code must use `apiClient` from `@/shared/lib/api-client` to call backend data. Never call `fetch('/api/...')` or any backend URL directly from hooks or components — all requests go through `apiClient` which provides structured error handling via `ApiRequestError`, consistent auth header injection, query parameter serialization, and 204/non-JSON response guards.

Flag `fetch('/api/stories')`, `fetch('/api/projects/...')` etc. called directly inside hooks (`src/modules/**/hooks/**`) or components without going through `apiClient`.

Compliant: `apiClient.stories.list(token, { limit: 10 })`
Violation: `await fetch('/api/stories?limit=10')`

### Violations

```
const res = await fetch('/api/stories'); const data = await res.json();
```

```
const data = await fetch(`/api/projects/${slug}`).then(r => r.json());
```

### Compliant

```
const data = await apiClient.stories.list(token, { limit: 10 });
```

```
const project = await apiClient.projects.getBySlug(slug);
```
