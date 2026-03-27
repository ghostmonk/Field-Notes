<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: destructive-confirm-dialog
title: Destructive actions must be confirmed via useConfirm with destructive flag
severity: warning
globs:
  - frontend/src/modules/**/*.tsx
  - frontend/src/components/**/*.tsx
  - frontend/src/pages/**/*.tsx
tags:
  - ux
  - safety
  - destructive-actions
---

Delete, unpublish, and other irreversible actions must be gated behind `useConfirm()` from `@/components/ConfirmDialog` with `destructive: true`. This renders the confirm button in the danger variant and focuses the cancel button by default (preventing accidental confirmation).

Usage pattern:
```ts
const confirm = useConfirm();
const handleDelete = async () => {
  const ok = await confirm({ title: 'Delete story?', message: '...', destructive: true });
  if (!ok) return;
  await apiClient.stories.delete(id, token);
};
```

Flag: delete/remove/unpublish handlers that call mutating API methods without first awaiting a `confirm()` call.

Note: `useConfirm` requires `ConfirmProvider` to be present in the component tree — it throws if called outside the provider.

### Violations

```
const handleDelete = async () => {
  await apiClient.stories.delete(story.id, token);
};
```

### Compliant

```
const confirm = useConfirm();
const handleDelete = async () => {
  const ok = await confirm({ title: 'Delete?', message: 'This cannot be undone.', destructive: true });
  if (!ok) return;
  await apiClient.stories.delete(story.id, token);
};
```
