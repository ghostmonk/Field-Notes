<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: release-notes-date-naming
title: Release note files must use YYYY-MM-DD-- date prefix
severity: warning
globs:
  - docs-site/pages/releases/**/*.mdx
  - docs-site/pages/releases/**/*.md
  - docs-site/pages/releases/_meta.ts
tags:
  - naming-convention
  - releases
  - docs-site
---

Release note files in `docs-site/pages/releases/` use a date-prefixed naming convention with a **double dash** separator: `YYYY-MM-DD--slug.mdx` (e.g., `2024-05-19--uploads.mdx`, `2026-03-25--video-poster.mdx`).

This is distinct from the plans naming convention which uses a single dash.

Flag any new release file that:
- Uses a single dash after the date (`2026-03-25-my-release.mdx`) instead of double dash (`2026-03-25--my-release.mdx`)
- Omits the date prefix entirely (e.g., `my-release.mdx`)
- Uses a non-ISO date format (e.g., `03-25-2026--slug.mdx`)

Exception: files named without dates that are clearly not dated releases (e.g., `migration-infrastructure.mdx`) are acceptable for undated infrastructure topics.

### Violations

```
docs-site/pages/releases/2026-03-25-my-feature.mdx (single dash)
```

```
docs-site/pages/releases/my-feature.mdx (no date)
```

### Compliant

```
docs-site/pages/releases/2026-03-25--my-feature.mdx
```
