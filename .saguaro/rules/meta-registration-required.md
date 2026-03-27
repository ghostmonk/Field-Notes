<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: meta-registration-required
title: New docs pages must be registered in the parent _meta.ts
severity: error
globs:
  - docs-site/pages/**/*.mdx
  - docs-site/pages/**/*.md
  - docs-site/pages/**/_meta.ts
tags:
  - nextra
  - navigation
  - docs-site
---

Every new `.mdx` or `.md` page added under `docs-site/pages/` must have a corresponding entry in the `_meta.ts` file in the same directory. Without it, Nextra will not include the page in the sidebar and it will be effectively unreachable from navigation.

When reviewing a diff:
- If a new `.mdx` file is added to e.g. `docs-site/pages/guides/my-topic.mdx`, check that `docs-site/pages/guides/_meta.ts` has a matching key `'my-topic': 'My Topic Label'`.
- If a new subdirectory is added (e.g. `docs-site/pages/features/new-feature/`), check that both `docs-site/pages/features/_meta.ts` registers the subdirectory key AND a new `docs-site/pages/features/new-feature/_meta.ts` exists.
- Flag any `.mdx` file whose slug key is absent from the corresponding `_meta.ts` default export object.

Acceptable: `_meta.ts` files may list entries without a corresponding page file (orphaned entries cause no harm), but the reverse is not acceptable.

### Violations

```
Adding docs-site/pages/guides/new-guide.mdx without adding 'new-guide': 'New Guide' to docs-site/pages/guides/_meta.ts
```

### Compliant

```
docs-site/pages/guides/_meta.ts exports { ..., 'new-guide': 'New Guide' } when docs-site/pages/guides/new-guide.mdx is also added
```
