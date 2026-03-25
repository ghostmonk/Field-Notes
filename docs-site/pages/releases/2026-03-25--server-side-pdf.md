# Server-Side PDF Generation

**Date:** 2026-03-25
**PR:** [#169](https://github.com/ghostmonk/Field-Notes/pull/169)
**Issues:** Closes #152, #80

## What changed

PDF resume downloads now generate server-side instead of in the browser. The `/api/resume/download-pdf` API route renders the PDF via `@react-pdf/renderer` on the Node.js server and streams the result back as a file download. The browser never loads the PDF rendering library.

This eliminates `unsafe-eval` from the Content Security Policy. The CSP `script-src` directive no longer includes `'unsafe-eval'` on any page.

## Changes

- New API route `/api/resume/download-pdf` — fetches resume data, renders PDF via `renderToBuffer`, returns with `Content-Disposition` header
- `PDFDownloadButton` calls `fetch()` + `saveAs()` instead of running `@react-pdf/renderer` client-side
- `ResumeDocument` extracted to `pdf-document.tsx` for server-side import without browser dependencies
- `UNSAFE_EVAL` removed from next.config.ts, Dockerfile, cloudbuild.yaml, deploy.yml, docker-compose.yml, package.json, and all documentation
- In-memory PDF cache with 5-minute TTL and stampede guard (coalesces concurrent cold-cache requests)
- Cache invalidated on resume PUT, DELETE, set-default, restore-original, and tailor
- `Content-Disposition` filename sanitized to prevent header injection
- `fetchBackend()` utility extracted to `shared/utils/backend-fetch.ts` — replaces boilerplate across 28 API routes, includes 10s `AbortSignal.timeout` by default
- `sanitizeFilename()` utility in same module
- Fixed pre-existing `Tabs.test.tsx` failure (test expected rendered children in hidden panel, but component uses lazy-mount)

## Post-merge manual steps

1. Delete the `UNSAFE_EVAL` GitHub variable from repo Settings > Secrets and variables > Actions > Variables
2. Close issue #80
