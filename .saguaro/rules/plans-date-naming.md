<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: plans-date-naming
title: Plans files must use YYYY-MM-DD- date prefix with single dash
severity: warning
globs:
  - docs-site/pages/plans/**/*.mdx
  - docs-site/pages/plans/**/*.md
  - docs-site/pages/plans/_meta.ts
tags:
  - naming-convention
  - plans
  - docs-site
---

Plan documents in `docs-site/pages/plans/` use a date-prefixed naming convention with a **single dash** separator after the date: `YYYY-MM-DD-slug.mdx` (e.g., `2026-03-01-phase-6-section-editor.mdx`, `2026-01-01-engagement-system.mdx`).

This is distinct from the releases naming convention which uses a double dash.

Flag any new plan file that:
- Uses double dash (`2026-03-25--my-plan.mdx`) instead of single dash
- Omits the date prefix (unless it is an issue-reference file like `issue-56-refactor-frontend-for-clarity.mdx`, which is an accepted legacy pattern)
- Uses a non-ISO date format

Acceptable exception: files prefixed with `issue-NN-` are a legacy pattern that exists in the codebase and should not be flagged.

### Violations

```
docs-site/pages/plans/2026-03-25--my-plan.mdx (double dash)
```

```
docs-site/pages/plans/my-new-plan.mdx (no date prefix)
```

### Compliant

```
docs-site/pages/plans/2026-03-25-my-plan.mdx
```

```
docs-site/pages/plans/issue-56-refactor-frontend-for-clarity.mdx (legacy exception)
```
