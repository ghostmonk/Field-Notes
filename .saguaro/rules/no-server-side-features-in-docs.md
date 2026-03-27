<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: no-server-side-features-in-docs
title: docs-site must not use Next.js server-side features
severity: error
globs:
  - docs-site/pages/**/*.tsx
  - docs-site/pages/**/*.ts
  - docs-site/pages/**/*.jsx
  - docs-site/pages/**/*.js
  - docs-site/next.config.mjs
tags:
  - static-export
  - github-pages
  - docs-site
---

The docs-site is built with `output: 'export'` in `docs-site/next.config.mjs`, which produces a fully static site deployed to GitHub Pages. Server-side Next.js features are incompatible with static export and will cause the build to fail.

Flag any of the following if introduced in `docs-site/`:
- `export async function getServerSideProps(...)` in any page file
- Files under `docs-site/pages/api/` (API routes are not supported in static export)
- `export const dynamic = 'force-dynamic'` or `export const runtime = 'edge'` in any page
- `next/headers`, `next/cookies`, or other server-only Next.js imports
- Removing or changing `output: 'export'` in `docs-site/next.config.mjs`

Acceptable: `getStaticProps` and `getStaticPaths` are fine as they are compatible with static export.

### Violations

```
export async function getServerSideProps() { return { props: {} } } in docs-site/pages/guides/some-page.tsx
```

```
Creating docs-site/pages/api/search.ts
```

```
Removing output: 'export' from docs-site/next.config.mjs
```

### Compliant

```
export async function getStaticProps() { return { props: {} } } in docs-site/pages/
```

```
Plain MDX pages with no data-fetching exports
```
