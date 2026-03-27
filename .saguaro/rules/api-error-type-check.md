<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: api-error-type-check
title: Caught API errors must be checked with instanceof ApiRequestError before accessing error fields
severity: error
globs:
  - frontend/src/**/*.ts
  - frontend/src/**/*.tsx
tags:
  - error-handling
  - type-safety
  - api
---

Errors thrown by `apiClient` and `fetchBackend` are instances of `ApiRequestError` from `@/shared/types/error`. Code that catches errors from API calls must use `instanceof ApiRequestError` before accessing `.status`, `.errorResponse`, `.getUserMessage()`, etc.

For user-facing messages use `ErrorService.getUserMessage(error)` (handles both `ApiRequestError` and plain `Error`). For status-specific branching, narrow with `instanceof ApiRequestError` first.

Do not:
- Cast caught errors with `error as ApiRequestError` without a type guard
- Access `.status` or `.message` on `unknown` typed errors directly
- Treat 404 responses as unexpected errors — `apiClient` already skips logging for 404s

Flag: `catch (error) { if (error.status === 401)` without an `instanceof` guard.

### Violations

```
} catch (error: any) {
  if (error.status === 401) { router.push('/signin'); }
}
```

```
} catch (e) {
  setError(e.message);
}
```

### Compliant

```
} catch (error) {
  if (error instanceof ApiRequestError && error.status === 401) { router.push('/signin'); }
  setError(ErrorService.getUserMessage(error));
}
```
