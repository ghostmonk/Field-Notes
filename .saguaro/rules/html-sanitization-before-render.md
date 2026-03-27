<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: html-sanitization-before-render
title: User-generated HTML content must be sanitized before dangerouslySetInnerHTML
severity: error
globs:
  - frontend/src/**/*.tsx
  - frontend/src/**/*.ts
tags:
  - security
  - xss
  - sanitization
---

Any HTML string originating from user input or the backend (story content, page content, project content) must be sanitized with `isomorphic-dompurify` (available in package.json) or the project's `@/shared/utils/sanitizer` module before being passed to `dangerouslySetInnerHTML`.

Flag: any `dangerouslySetInnerHTML={{ __html: <expression> }}` where `<expression>` is not a call to `sanitize()`, `DOMPurify.sanitize()`, or a string literal. This includes but is not limited to `story.content`, `page.content`, `project.content`, or any other dynamic value.

Exception: If content is sanitized before storage and the write path enforces this (e.g., the API endpoint passes all HTML through DOMPurify before saving to the database), the render site may skip re-sanitization BUT must still call the sanitizer. Defense-in-depth — the cost of a redundant sanitize call is negligible compared to an XSS.

If re-sanitization is genuinely not possible (e.g., performance-critical SSR of large documents), document it with a comment that names the specific upstream function responsible for sanitization, not just "already sanitized." 
