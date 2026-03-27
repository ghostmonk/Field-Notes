<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: draft-recovery-in-editors
title: Editor forms must use useDraftRecovery for autosave and recovery
severity: warning
globs:
  - frontend/src/modules/editor/**/*.ts
  - frontend/src/modules/editor/**/*.tsx
tags:
  - ux
  - data-safety
  - editor
---

All editor forms (story, project, page) must integrate `useDraftRecovery` from `@/modules/editor/hooks/useDraftRecovery` for localStorage-based autosave and crash recovery.

Required integration:
- Call `useDraftRecovery<T>({ contentType, entityId?, sectionId?, isEmpty? })`
- On mount: call `loadDraft()` and offer recovery if a draft exists
- On user input: call `startAutosave(() => getCurrentState())` (fires every 30 seconds)
- On successful save/discard: call `clearDraft()` to remove stale data

Draft keys follow the pattern `field-notes-draft-{contentType}-{edit|new}-{id}`. Using `contentType` ensures drafts from different editor types (story vs project) don't collide.

Flag: new editor hooks that manage form state but do not call `saveDraft`/`loadDraft`/`clearDraft`.

### Violations

```
// Editor hook that manages title/content state but never calls useDraftRecovery
```

### Compliant

```
const { saveDraft, loadDraft, clearDraft, startAutosave } = useDraftRecovery<StoryDraft>({ contentType: 'story', entityId: storyId });
```
