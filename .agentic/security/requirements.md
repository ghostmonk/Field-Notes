# Security Requirements

## XSS Protection

- **Store raw user input** in the database (no HTML escaping on backend)
- **Rely on React's auto-escaping** for XSS protection — React escapes content automatically when rendered via `{content}`
- **Never use `dangerouslySetInnerHTML`** with user-generated content
- **Do NOT double-encode**: Backend escaping + frontend decoding creates bugs when users enter literal entities like `&lt;`

## Input Validation

- Never trust client-side validation alone — validate on the backend
- Use parameterized queries for database operations (MongoDB driver handles this)
- Never construct queries with string concatenation

## Authentication & Rate Limiting

- Authenticate and authorize all mutation endpoints
- Rate limit all mutation endpoints to human-realistic rates (e.g., 5-10 requests/minute for user actions like comments, reactions)
