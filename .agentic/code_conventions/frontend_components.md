# Frontend Component Conventions

## UI Primitives

Use components from `@/components/ui` — `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `FormField`, `Badge`, `Card`, `Grid`, `Tabs`. Don't create ad-hoc styled `<button>`, `<input>`, or `<dialog>` elements in feature code.

## Destructive Actions

Delete, unpublish, and irreversible actions must be gated behind `useConfirm()` from `@/components/ConfirmDialog` with `destructive: true`. Never call a mutating API method without awaiting a `confirm()` first.

## Draft Recovery

All editor forms (story, project, page) must integrate `useDraftRecovery` for localStorage-based autosave and crash recovery. Call `loadDraft()` on mount, `startAutosave()` on input, `clearDraft()` on successful save.

## Error Display

Render errors with `ErrorDisplay`, `InlineError`, or `ErrorToast` from `@/components/ErrorDisplay`. Don't render raw error strings in ad-hoc styled elements. Use `ErrorService.getUserMessage(error)` for user-facing messages.

## Error Type Narrowing

Check `instanceof ApiRequestError` from `@/shared/types/error` before accessing `.status`, `.errorResponse`, or `.getUserMessage()`. Don't cast caught errors with `as ApiRequestError` without a guard.

## File Uploads

Validate files with `validateImageFile()`, `validateImageType()`, or `validateVideoFile()` from `@/shared/utils/uploadUtils` before uploading. Don't write inline size or type checks. Resize large images with `resizeImageFile()` before upload.
