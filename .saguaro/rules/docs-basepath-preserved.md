<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: docs-basepath-preserved
title: docs-site basePath must remain /Field-Notes
severity: error
globs:
  - docs-site/next.config.mjs
tags:
  - github-pages
  - static-export
  - docs-site
---

The `basePath` in `docs-site/next.config.mjs` is set to `'/Field-Notes'` to match the GitHub Pages deployment URL (`https://ghostmonk.github.io/Field-Notes/`). Changing or removing this value will break all navigation, asset loading, and links when deployed.

Flag any diff that:
- Changes `basePath: '/Field-Notes'` to a different value
- Removes the `basePath` property entirely
- Changes `images.unoptimized: true` to `false` — this is required for static export to GitHub Pages and must remain `true`

### Violations

```
basePath: '/field-notes' (lowercase)
```

```
Removing basePath from the withNextra config object
```

```
images: { unoptimized: false }
```

### Compliant

```
basePath: '/Field-Notes' with images: { unoptimized: true }
```
