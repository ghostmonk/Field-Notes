<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: mock-server-and-client-route-consistency
title: E2E test data must be defined in test-data.ts and shared between mock-server and route mocks
severity: warning
globs:
  - frontend/e2e/**/*.ts
tags:
  - testing
  - e2e
  - mock-data
---

E2E test data is shared between the Express mock server (`e2e/mock-server.ts`, handles SSR requests on port 5555) and Playwright `page.route()` client-side mocks. Both must use data from `e2e/test-data.ts`.

Do not:
- Hardcode response objects inline in `mock-server.ts` or in fixture files
- Define test entity IDs or slugs in multiple places — use `TEST_STORY_IDS`, `TEST_PROJECT_IDS`, `TEST_SECTION_IDS`, etc.
- Create test stories/projects/pages without using the `createTest*()` factory helpers when customization is needed

Keeping both sources in sync prevents SSR responses (from mock-server) differing from client-side mocked responses, which would cause hydration mismatches in tests.

### Violations

```
// In mock-server.ts route handler:
res.json({ id: 'story-1', title: 'My Story', ... }); // hardcoded, not from test-data.ts
```

### Compliant

```
import { sampleStories, TEST_STORY_IDS } from '../test-data';
app.get('/stories/:id', (req, res) => {
  const story = sampleStories.find(s => s.id === req.params.id);
  res.json(story ?? null);
});
```
