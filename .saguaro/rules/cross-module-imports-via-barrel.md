<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: cross-module-imports-via-barrel
title: Cross-module imports must go through the module's index.ts barrel
severity: warning
globs:
  - frontend/src/modules/**/*.ts
  - frontend/src/modules/**/*.tsx
  - frontend/src/pages/**/*.ts
  - frontend/src/pages/**/*.tsx
tags:
  - architecture
  - module-boundaries
  - encapsulation
---

Each module under `src/modules/` exposes its public API through an `index.ts` barrel (e.g., `src/modules/stories/index.ts`, `src/modules/editor/index.ts`). Code outside a module must import only from the module's barrel, not from internal paths.

Flag:
- `import { StoryCard } from '@/modules/stories/components/StoryCard'` (bypasses barrel)
- `import { useStoryEditor } from '@/modules/editor/hooks/useStoryEditor'` (bypasses barrel)

Compliant:
- `import { StoryCard } from '@/modules/stories'`
- `import { useStoryEditor } from '@/modules/editor/hooks'` (the hooks sub-barrel is acceptable if exported)

Exception: files within the same module may import from sibling files directly.

### Violations

```
import { StoryCard } from '@/modules/stories/components/StoryCard';
```

```
import { useResumeEditor } from '@/modules/resume/hooks/useResumeEditor';
```

### Compliant

```
import { StoryCard } from '@/modules/stories';
```

```
import { useResumeEditor } from '@/modules/resume';
```
