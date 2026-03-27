<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: backend-url-vs-next-public-api-url
title: SSR/proxy backend calls must use BACKEND_URL, not NEXT_PUBLIC_API_URL
severity: warning
globs:
  - frontend/src/**/*.ts
  - frontend/src/**/*.tsx
  - frontend/next.config.ts
tags:
  - architecture
  - environment
  - next.js
  - docker
---

This codebase distinguishes two API URL environment variables with different scopes:
- `BACKEND_URL` — server-side only, resolves to the internal Docker service name (e.g., `http://backend:5001`) or the local dev host. Used in `next.config.ts` rewrites for proxying `/uploads/` and in SSR fetch calls.
- `NEXT_PUBLIC_API_URL` — inlined into the client bundle at build time, must point to a publicly reachable URL.

Look for:
- `process.env.NEXT_PUBLIC_API_URL` used in server-side code (API routes, `getServerSideProps`, server actions, `next.config.ts`) where `BACKEND_URL` should be used instead — this bypasses the internal Docker network and adds unnecessary round-trips
- `process.env.BACKEND_URL` used in client-side component code — this variable is undefined in the browser

As established in `next.config.ts`:
```ts
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.ghostmonk.com';
```
Server-side code should prefer `BACKEND_URL` with `NEXT_PUBLIC_API_URL` as fallback, not the reverse.

### Violations

```
// In an API route (server-side)
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`);
```

```
// In a client component
const url = process.env.BACKEND_URL + '/api/data';
```

### Compliant

```
// In next.config.ts (config-level, fetchBackend not available)
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
```

```
// In an API route or rendering code (use fetchBackend, not raw fetch)
import { fetchBackend } from '@/shared/utils/backend-fetch';
const res = await fetchBackend('/posts');
```

```
// In a client component
const url = process.env.NEXT_PUBLIC_API_URL + '/api/data';
```
