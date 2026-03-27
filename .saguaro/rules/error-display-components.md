<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: error-display-components
title: Errors shown to users must use ErrorDisplay, InlineError, or ErrorToast
severity: warning
globs:
  - frontend/src/modules/**/*.tsx
  - frontend/src/components/**/*.tsx
  - frontend/src/pages/**/*.tsx
  - "!frontend/src/components/ErrorDisplay.tsx"
tags:
  - ux
  - error-handling
  - consistency
---

User-visible error messages must be rendered using one of the three error display components from `@/components/ErrorDisplay`: `ErrorDisplay` (inline block), `InlineError` (form field errors), or `ErrorToast` (auto-dismissing overlay).

These components integrate with `ErrorService` to:
- Map `ApiRequestError.errorResponse` to user-friendly messages
- Apply severity-based styling (info/warning/error/critical)
- Surface `ErrorDetails` fields like `max_file_size`, `allowed_formats`
- Provide actionable suggestions

Flag:
- `<p className="text-red-600">{error.message}</p>` or similar raw error string rendering
- `{error && <div>{error}</div>}` in JSX
- Direct access to `.message` on caught errors for display without going through `ErrorService.getUserMessage()`

### Violations

```
{error && <p className="text-red-500">{error.message}</p>}
```

```
<span className="text-red-600">{errorMessage}</span>
```

### Compliant

```
<ErrorDisplay error={error} onDismiss={() => setError(null)} />
```

```
<InlineError error={fieldError} />
```

```
<ErrorToast error={uploadError} onDismiss={() => setUploadError(null)} />
```
