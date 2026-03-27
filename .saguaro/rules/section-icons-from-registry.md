<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: section-icons-from-registry
title: Section icons must use values from SECTION_ICONS / iconMap
severity: warning
globs:
  - frontend/src/**/*.ts
  - frontend/src/**/*.tsx
tags:
  - architecture
  - ui
  - sections
---

Section icon identifiers must be chosen from the `SECTION_ICONS` constant array defined in `@/shared/lib/navIcons`. The `iconMap` record maps these string keys to `react-icons/hi` components.

Do not:
- Use arbitrary strings as icon names that are not in `SECTION_ICONS`
- Import icon components directly from `react-icons/hi` for section nav icons — use `iconMap[icon]` instead
- Hardcode icon component references bypassing the registry

The `SectionIcon` type (a union of all `SECTION_ICONS` tuple values) should be used for typing `icon` fields on section objects.

Flag: code that renders section icons by directly importing from `react-icons/hi` rather than looking up via `iconMap`, or that creates section records with `icon` values not in `SECTION_ICONS`.

### Violations

```
import { HiHome } from 'react-icons/hi';
// ... <HiHome /> used as a section icon directly
```

```
const section = { icon: 'rocket', ... }; // 'rocket' is not in SECTION_ICONS
```

### Compliant

```
import { iconMap } from '@/shared/lib/navIcons';
const IconComponent = iconMap[section.icon] ?? iconMap['default'];
return <IconComponent className="h-5 w-5" />;
```
