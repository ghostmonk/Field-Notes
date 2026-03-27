<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: data-testid-on-interactive-elements
title: Interactive and key display elements must have data-testid attributes
severity: warning
globs:
  - frontend/src/modules/**/*.tsx
  - frontend/src/components/**/*.tsx
  - frontend/src/layout/**/*.tsx
tags:
  - testing
  - e2e
  - playwright
---

Playwright E2E tests select elements exclusively via `data-testid` (configured via `testIdAttribute: 'data-testid'` in `playwright.config.ts`). New interactive elements — buttons, links, form inputs, list containers, empty/error states — must have a `data-testid` attribute.

Naming conventions observed in the codebase:
- Entity-scoped: `story-card-{id}`, `story-edit-{id}`, `story-delete-{id}`, `story-title-{id}`
- Container elements: `stories-list`, `stories-empty`, `stories-error`
- Nav elements: `top-nav`, `nav-{section}-link`, `hamburger-button`, `menu-overlay`
- Action elements: `confirm-dialog`, `confirm-ok`, `confirm-cancel`
- Toast elements: `toast-{type}`

Flag: buttons, links (`<Link>`, `<a>`), form containers, and list wrappers added without `data-testid`.

### Violations

```
<button onClick={handleDelete}>Delete</button>
```

```
<div className="stories-container">{stories.map(...)}</div>
```

### Compliant

```
<Button data-testid={`story-delete-${story.id}`} onClick={handleDelete}>Delete</Button>
```

```
<div data-testid="stories-list">{stories.map(...)}</div>
```
