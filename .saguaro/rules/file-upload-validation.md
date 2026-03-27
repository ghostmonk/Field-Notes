<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: file-upload-validation
title: File uploads must be validated with uploadUtils validators before sending
severity: error
globs:
  - frontend/src/**/*.ts
  - frontend/src/**/*.tsx
tags:
  - validation
  - uploads
  - bug-prevention
---

Before uploading any file, validate it using the helpers from `@/shared/utils/uploadUtils`. Do not implement ad-hoc size or type checks.

- Images: call `validateImageType(file)` (type-only, when client-side resize follows) or `validateImageFile(file)` (type + size)
- Videos: call `validateVideoFile(file)` (type + size)
- Large images should additionally be resized with `resizeImageFile(file, MAX_CLIENT_RESIZE_DIMENSION)` before upload (skip for GIFs — handled internally)

The validators use the canonical constants: `MAX_IMAGE_SIZE` (5 MB), `MAX_VIDEO_SIZE` (100 MB), `ALLOWED_IMAGE_TYPES`, `ALLOWED_VIDEO_TYPES`.

Flag:
- `file.size > someNumber` inline checks instead of using the utility
- `file.type.startsWith('image/')` inline checks instead of `isAllowedImageType(file.type)`
- Uploading without any validation call

### Violations

```
if (file.size > 5242880) { setError('Too large'); return; }
```

```
if (!['image/jpeg','image/png'].includes(file.type)) { return; }
```

### Compliant

```
const { isValid, error } = validateImageType(file);
if (!isValid) { showError(error); return; }
const resized = await resizeImageFile(file);
```
