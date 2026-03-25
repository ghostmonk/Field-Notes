# Server-Side PDF Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move PDF generation from client-side `@react-pdf/renderer` to a Next.js API route, eliminating the need for `unsafe-eval` in the Content Security Policy.

**Architecture:** Create a `/api/resume/download-pdf` API route that imports `@react-pdf/renderer`, renders the `ResumeDocument` component server-side, and streams the PDF back as a file download. The client-side `PDFDownloadButton` becomes a simple fetch-and-download trigger. All `UNSAFE_EVAL` references are removed from the deployment pipeline.

**Tech Stack:** Next.js API routes, `@react-pdf/renderer` (server-side), React (JSX rendering in Node.js)

**Issue:** #152

---

### Task 1: Create the server-side PDF API route

**Files:**
- Create: `frontend/src/pages/api/resume/download-pdf.ts`
- Reference: `frontend/src/modules/resume/generators/pdf-generator.tsx` (ResumeDocument component)
- Reference: `frontend/src/pages/api/resume/public.ts` (pattern for fetching resume data)

**Step 1: Write the API route**

The route fetches resume data from the backend, renders the PDF server-side via `@react-pdf/renderer`'s `pdf().toBuffer()`, and returns it with appropriate headers.

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { renderToBuffer } from '@react-pdf/renderer';
import { ResumeDocument } from '@/modules/resume/generators/pdf-document';
import { getResumeFilename } from '@/modules/resume/shared';
import { Resume } from '@/shared/types/api';
import { apiLogger } from '@/shared/utils/logger';
import React from 'react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const API_BASE_URL =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!API_BASE_URL) {
    return res.status(500).json({ detail: 'Backend URL not configured' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/resume/public`);

    if (!response.ok) {
      return res.status(response.status).json({ detail: 'Failed to fetch resume' });
    }

    const resume: Resume = await response.json();

    const buffer = await renderToBuffer(
      React.createElement(ResumeDocument, { resume })
    );

    const filename = getResumeFilename(resume, 'pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    apiLogger.error(
      'PDF generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'PDF generation failed' });
  }
}
```

Note: `renderToBuffer` is the Node.js-specific API from `@react-pdf/renderer` — it returns a `Buffer` directly without needing browser APIs. If `renderToBuffer` is not exported from the main package, use `import { renderToBuffer } from '@react-pdf/renderer/lib/renderToBuffer'` or fall back to `pdf().toBuffer()`. Verify the exact import during implementation.

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors related to `download-pdf.ts`

**Step 3: Commit**

```bash
git add frontend/src/pages/api/resume/download-pdf.ts
git commit -m "feat: add server-side PDF generation API route (#152)"
```

---

### Task 2: Extract ResumeDocument into a shared module

The `ResumeDocument` component and its dependencies (SVG icons, styles, helpers) currently live in `pdf-generator.tsx` alongside the client-side `PDFDownloadButton`. Extract the document component into its own file so it can be imported by the API route without pulling in React hooks or browser code.

**Files:**
- Create: `frontend/src/modules/resume/generators/pdf-document.tsx`
- Modify: `frontend/src/modules/resume/generators/pdf-generator.tsx`

**Step 1: Create `pdf-document.tsx`**

Move these from `pdf-generator.tsx` into the new file:
- All SVG icon components (`PhoneIcon`, `EmailIcon`, `LocationIcon`, `WebIcon`, `LinkedInIcon`, `GitHubIcon`)
- `ICON_SIZE` and `ICON_COLOR` constants
- `styles` StyleSheet
- `DescriptionBlock` component
- `ContactEntry` component
- `PAGE1_JOB_COUNT` constant
- `JobEntry` component
- `ResumeDocument` component

Export `ResumeDocument` as a named export.

Imports needed in `pdf-document.tsx`:
```typescript
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { Resume } from '@/shared/types/api';
import { parseDescription, RESUME_NAVY } from '../shared';
```

**Step 2: Update `pdf-generator.tsx`**

Remove all moved code. Import `ResumeDocument` from `./pdf-document`. The file should contain only:
- Import of `ResumeDocument` from `./pdf-document`
- Import of `pdf` from `@react-pdf/renderer`
- Import of `useState` from React
- Import of `getResumeFilename` from `../shared`
- The `PDFDownloadButton` component (unchanged logic, but now references imported `ResumeDocument`)

**Step 3: Verify no regressions**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add frontend/src/modules/resume/generators/pdf-document.tsx frontend/src/modules/resume/generators/pdf-generator.tsx
git commit -m "refactor: extract ResumeDocument into shared pdf-document module (#152)"
```

---

### Task 3: Convert PDFDownloadButton to use the API route

**Files:**
- Modify: `frontend/src/modules/resume/generators/pdf-generator.tsx`
- Modify: `frontend/src/modules/resume/components/DownloadButtons.tsx`

**Step 1: Rewrite `PDFDownloadButton` to fetch from API**

Replace the client-side `pdf().toBlob()` call with a fetch to `/api/resume/download-pdf`. The component no longer needs `@react-pdf/renderer` imports.

```typescript
import { useState } from 'react';
import { Resume } from '@/shared/types/api';
import { getResumeFilename } from '../shared';

export function PDFDownloadButton({ resume }: { resume: Resume }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/resume/download-pdf');
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = getResumeFilename(resume, 'pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="btn btn-primary text-sm flex items-center gap-1.5"
        title="Download PDF"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {generating ? 'Generating...' : 'PDF'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </>
  );
}
```

**Step 2: Update `DownloadButtons.tsx`**

Remove the `dynamic()` import wrapper. The `PDFDownloadButton` no longer needs `ssr: false` since it doesn't import `@react-pdf/renderer` — it just calls `fetch()`.

```typescript
import { useState } from 'react';
import { Resume } from '@/shared/types/api';
import { HiOutlineDocumentDownload } from 'react-icons/hi';
import { PDFDownloadButton } from '../generators/pdf-generator';

interface DownloadButtonsProps {
  resume: Partial<Resume>;
}

export function DownloadButtons({ resume }: DownloadButtonsProps) {
  // ... rest unchanged, just remove the dynamic import
}
```

Remove the `next/dynamic` import entirely.

**Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/src/modules/resume/generators/pdf-generator.tsx frontend/src/modules/resume/components/DownloadButtons.tsx
git commit -m "feat: PDFDownloadButton fetches from server-side API route (#152)"
```

---

### Task 4: Remove UNSAFE_EVAL from all configuration

**Files:**
- Modify: `frontend/next.config.ts` (lines 67-70)
- Modify: `frontend/Dockerfile` (lines 15, 17)
- Modify: `frontend/cloudbuild.yaml` (lines 7-8, 16)
- Modify: `.github/workflows/deploy.yml` (lines 182, 189)
- Modify: `docker-compose.yml` (line 46)
- Modify: `.env.example` (line 15)
- Modify: `frontend/package.json` (line 21, `dev:test` script)
- Modify: `README.md` (line 152)
- Modify: `frontend/README.md` (lines 98-118, security notice section)
- Modify: `docs-site/pages/guides/github-actions-video-setup.mdx` (line 53)

**Step 1: Update `next.config.ts`**

Remove lines 67 and 69-70. Replace the `scriptSrc` construction:

Before:
```typescript
const isUnsafeEval = process.env.UNSAFE_EVAL === "true";
const devSources = isDev ? 'http://localhost:5001' : '';
// UNSAFE_EVAL=true required in production for @react-pdf/renderer (client-side PDF generation)
const scriptSrc = `'self' 'unsafe-inline' ${isUnsafeEval ? "'unsafe-eval'" : ''} ${apiUrl}`;
```

After:
```typescript
const devSources = isDev ? 'http://localhost:5001' : '';
const scriptSrc = `'self' 'unsafe-inline' ${apiUrl}`;
```

**Step 2: Update `Dockerfile`**

Remove lines 15 and 17:
```dockerfile
ARG UNSAFE_EVAL
ENV UNSAFE_EVAL=${UNSAFE_EVAL}
```

**Step 3: Update `cloudbuild.yaml`**

Remove the `UNSAFE_EVAL` build-arg and substitution:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NEXT_PUBLIC_API_URL=${_NEXT_PUBLIC_API_URL}'
      - '-t'
      - 'gcr.io/$PROJECT_ID/turbulent-frontend'
      - '.'
images:
  - 'gcr.io/$PROJECT_ID/turbulent-frontend'
substitutions:
  _NEXT_PUBLIC_API_URL: ''
```

**Step 4: Update `deploy.yml`**

Line 182 — remove `,_UNSAFE_EVAL=${{ vars.UNSAFE_EVAL }}` from `--substitutions`
Line 189 — remove `,UNSAFE_EVAL=${{ vars.UNSAFE_EVAL }}` from `--set-env-vars`

**Step 5: Update `docker-compose.yml`**

Remove `- UNSAFE_EVAL=${UNSAFE_EVAL}` from the frontend service environment.

**Step 6: Update `.env.example`**

Remove the `UNSAFE_EVAL=true` line.

**Step 7: Update `frontend/package.json`**

Remove `UNSAFE_EVAL=true` from the `dev:test` script.

**Step 8: Update documentation**

- `README.md`: Remove the `UNSAFE_EVAL` line from environment variables section
- `frontend/README.md`: Remove the entire "Security Notice: UNSAFE_EVAL Flag" section (lines 98-118)
- `docs-site/pages/guides/github-actions-video-setup.mdx`: Remove the `UNSAFE_EVAL` line

**Step 9: Commit**

```bash
git add frontend/next.config.ts frontend/Dockerfile frontend/cloudbuild.yaml \
  .github/workflows/deploy.yml docker-compose.yml .env.example \
  frontend/package.json README.md frontend/README.md \
  docs-site/pages/guides/github-actions-video-setup.mdx
git commit -m "chore: remove UNSAFE_EVAL from all config and deployment (#152)"
```

---

### Task 5: Manual testing

**Step 1: Start local dev environment**

```bash
make dev-local
```

**Step 2: Test PDF download**

1. Navigate to `http://localhost:3000/resume`
2. Click the PDF download button
3. Verify a PDF file downloads with correct filename (`{Name}_Resume.pdf`)
4. Open the PDF and verify it renders correctly (header, work experience, skills, education)

**Step 3: Test DOCX download**

1. On the same page, click the DOCX download button
2. Verify DOCX still downloads correctly (regression check)

**Step 4: Verify CSP header**

Open browser DevTools → Network tab → reload the page → inspect the response headers on the document request. Confirm:
- `Content-Security-Policy` contains `script-src 'self' 'unsafe-inline'`
- `unsafe-eval` does NOT appear anywhere in the CSP header

**Step 5: Test the API route directly**

```bash
curl -I http://localhost:3000/api/resume/download-pdf
```

Expected headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="..."`

---

### Task 6: Run automated tests

**Step 1: Run frontend unit tests**

```bash
make test-frontend-unit
```

Expected: All pass

**Step 2: Run e2e tests**

Stop Docker frontend first, then run Playwright:

```bash
docker compose stop frontend
make test-frontend
```

The existing resume download e2e tests (`frontend/e2e/specs/resume/resume-download.spec.ts`) should pass unchanged — the download UX (click button → file downloads) is identical. The only difference is the PDF bytes come from the API route instead of client-side rendering.

**Step 3: Run backend tests**

```bash
make test
```

Expected: All pass (no backend changes in this PR)

**Step 4: Run formatting**

```bash
make format
```

**Step 5: Commit any format fixes**

---

### Task 7: Post-merge cleanup

After the PR merges:

1. **Delete the `UNSAFE_EVAL` GitHub variable** from the repository settings (Settings → Secrets and variables → Actions → Variables). This is a manual step — the variable is no longer referenced by any workflow.

2. **Close issue #80** ("Security: Prevent UNSAFE_EVAL in production CSP") — fully resolved by removing the variable entirely.

---

## Risk Notes

- `@react-pdf/renderer`'s `renderToBuffer` / `pdf().toBuffer()` runs in Node.js without browser APIs. The PDF document components use only `@react-pdf/renderer` primitives (Document, Page, Text, View, Svg, Path) which are environment-agnostic. Verify during Task 1 that the import works in the API route context.
- The API route fetches resume data from the backend on every PDF request. This is acceptable — resume data is small and the endpoint is already cached (5-minute `max-age` on `/api/resume/public`). The API route itself should not be cached since it generates a binary file.
- E2e tests should work unchanged because they test the download UX (button click → file appears), not the generation mechanism.
