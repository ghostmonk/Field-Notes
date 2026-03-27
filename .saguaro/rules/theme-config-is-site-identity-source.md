<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: theme-config-is-site-identity-source
title: Site identity belongs in theme.config.tsx, not scattered across pages
severity: warning
globs:
  - docs-site/theme.config.tsx
  - docs-site/pages/**/*.tsx
  - docs-site/pages/**/*.mdx
tags:
  - nextra
  - site-config
  - docs-site
---

All site-wide identity configuration — logo, project repository link, `docsRepositoryBase`, and footer content — is defined in a single file: `docs-site/theme.config.tsx`. This is the Nextra `DocsThemeConfig` object.

Flag changes that:
- Hardcode the GitHub repo URL (`https://github.com/ghostmonk/Field-Notes`) in individual page files instead of referencing it through the theme config
- Duplicate the site title (`Field Notes Docs`) in individual page frontmatter when it is already set via `og:title` in the theme config `head`
- Add a second footer or logo definition outside of `theme.config.tsx`

Changes to the `docsRepositoryBase` value must reflect the actual repository path so the 'Edit this page' link remains accurate.

### Violations

```
Hardcoding <a href="https://github.com/ghostmonk/Field-Notes"> in an MDX page instead of using the project link from theme config
```

```
Setting docsRepositoryBase to a branch other than main/tree/main/docs-site without updating the actual branch
```

### Compliant

```
All repo links flow from docsRepositoryBase in theme.config.tsx
```

```
docsRepositoryBase: 'https://github.com/ghostmonk/Field-Notes/tree/main/docs-site'
```
