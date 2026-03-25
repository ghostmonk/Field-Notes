# Generic Draft Recovery

**Date:** 2026-03-25
**PR:** [#170](https://github.com/ghostmonk/Field-Notes/pull/170)
**Issue:** Closes #166

## What changed

All editors now auto-save to localStorage every 30 seconds and recover unsaved work on return. Previously only the story editor had this protection — project, page, photo essay, and resume editors silently lost work on session expiry or navigation.

## Changes

- `useDraftRecovery<T>` generalized with type parameter and options object (`contentType`, `entityId`, `sectionId`, `isEmpty`)
- Draft envelope format: `{ data: T, savedAt: number }` with 7-day expiry
- Key format: `field-notes-draft-{contentType}-{edit|new}-{id}` with legacy key migration for existing story drafts
- Added to: `useProjectEditor`, `PageEditorForm`, `PhotoEssayEditor`, `useResumeEditor`
- Each editor: 30s autosave interval, `beforeunload` save, session error save, draft recovery banner on load, clear on successful save
- Photo essay drafts persist title, description, photos (urls + captions + ordering), cover image, and publish state — not transient upload/drag state
- 15 unit tests for the generic hook

## How it works

**Automatic (localStorage):** Every 30 seconds while editing, dirty state is saved to `localStorage`. On page close or session expiry, state is saved immediately. On return, a recovery banner offers to restore or dismiss the draft.

**Manual (server):** Clicking "Save Draft" saves to the backend with `is_published: false`. This already existed for stories; project and page editors now support it too. Server drafts persist across devices.
