<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: adr-sequential-numbering
title: ADR files must use sequential zero-padded 4-digit prefix
severity: warning
globs:
  - docs-site/pages/adr/**/*.mdx
  - docs-site/pages/adr/**/*.md
  - docs-site/pages/adr/_meta.ts
tags:
  - adr
  - naming-convention
  - docs-site
---

Architecture Decision Records in `docs-site/pages/adr/` follow a sequential naming convention: `NNNN-kebab-case-title.mdx` where `NNNN` is a zero-padded 4-digit number (e.g. `0001`, `0002`, `0005`).

When reviewing a new ADR file:
- The filename must match the pattern `^[0-9]{4}-[a-z0-9-]+\.mdx$`
- The number must be exactly one higher than the current highest-numbered ADR (check existing files in `docs-site/pages/adr/`)
- The corresponding `_meta.ts` entry key must match the filename slug exactly, and the label must include the ADR number prefix (e.g., `'0006-new-decision': 'ADR-0006: New Decision'`)

Flag:
- Files that skip numbers (e.g., going from 0005 to 0007)
- Files that reuse an existing number
- Files that use a non-zero-padded number (e.g., `6-title.mdx` instead of `0006-title.mdx`)
- `_meta.ts` entries whose label does not include the `ADR-NNNN:` prefix pattern

### Violations

```
docs-site/pages/adr/6-my-decision.mdx (missing zero-padding)
```

```
docs-site/pages/adr/0007-skipped.mdx when 0006 doesn't exist yet
```

```
'0006-new': 'New Decision' in _meta.ts (missing ADR-0006: prefix in label)
```

### Compliant

```
docs-site/pages/adr/0006-new-decision.mdx
```

```
'0006-new-decision': 'ADR-0006: New Decision' in _meta.ts
```
