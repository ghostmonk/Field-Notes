<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: no-direct-env-var-in-frontend-src
title: Server-side env vars must be accessed through fetchBackend()/getBackendUrl(), not process.env directly
severity: warning
globs:
  - frontend/src/pages/api/**/*.ts
  - frontend/src/rendering/**/*.ts
tags:
  - architecture
  - configuration
  - server-side
---

The backend URL may be `BACKEND_URL` (Docker-internal) or `NEXT_PUBLIC_API_URL` (local dev). The selection logic lives in `getBackendUrl()` from `@/shared/utils/backend-fetch`. Do not replicate this logic inline.

Flag:
- `process.env.BACKEND_URL` or `process.env.NEXT_PUBLIC_API_URL` accessed directly in `src/pages/api/**` or `src/rendering/**` to build a URL
- `const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL` duplications

Exception: `NEXT_PUBLIC_*` vars used for non-URL purposes (e.g., feature flags) may be accessed directly.

### Violations

```
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
const res = await fetch(`${backendUrl}/stories`);
```

### Compliant

```
import { fetchBackend } from '@/shared/utils/backend-fetch';
const res = await fetchBackend('/stories');
```
