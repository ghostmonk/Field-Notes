# Frontend Security Conventions

## HTML Sanitization

Any HTML from user input or the backend must pass through `DOMPurify.sanitize()` or `@/shared/utils/sanitizer` before rendering with `dangerouslySetInnerHTML`. Defense-in-depth — even if content is sanitized on write, sanitize on read too.
