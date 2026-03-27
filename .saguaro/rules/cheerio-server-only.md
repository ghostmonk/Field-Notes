<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: cheerio-server-only
title: cheerio must only be imported in server-side code
severity: error
globs:
  - frontend/src/**/*.ts
  - frontend/src/**/*.tsx
tags:
  - architecture
  - client-server-boundary
  - build
---

`cheerio` is explicitly excluded from the client bundle in `next.config.ts` via both `turbopack.resolveAlias` (`{ browser: '' }`) and `webpack resolve.fallback` (`{ cheerio: false }`). Importing it in client-side code will silently produce a broken module.

Flag any `import ... from 'cheerio'` or `require('cheerio')` in files that:
- Are React components (files with JSX rendering)
- Are client-side hooks (`src/hooks/`, `src/context/`)
- Are imported (directly or transitively) by client-side code

When in doubt, check the import chain — if any path from a client-rendered module reaches the cheerio import, it will break silently at runtime with no build error.

Safe locations: `src/pages/api/**`, `src/rendering/server/**`, or any file that is only ever called from `getServerSideProps` / `getStaticProps` / API route handlers.

### Violations

```
import * as cheerio from 'cheerio'; // in a React component
```

```
import { load } from 'cheerio'; // in a client-side hook
```

### Compliant

```
// In src/pages/api/search.ts
import * as cheerio from 'cheerio';
```
