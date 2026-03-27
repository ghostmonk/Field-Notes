<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: playwright-data-testid-selectors
title: Playwright E2E tests must use data-testid selectors, not CSS classes or element types
severity: warning
globs:
  - frontend/e2e/**/*.ts
tags:
  - testing
  - playwright
  - e2e
---

The Playwright config in `frontend/playwright.config.ts` sets `testIdAttribute: 'data-testid'`, establishing `data-testid` as the canonical selector strategy for resilient tests. Tests must use `page.getByTestId('...')` or `locator('[data-testid="..."]')` rather than CSS class selectors or element-type selectors that are fragile under UI changes.

Look for:
- `page.locator('.some-class')` — CSS class selectors break on style refactors
- `page.locator('button')`, `page.locator('div > span')` — element-type selectors are ambiguous
- `page.locator('#some-id')` — ID selectors are acceptable but `data-testid` is preferred

Acceptable:
- `page.getByTestId('submit-button')`
- `page.locator('[data-testid="hero-section"]')`
- `page.getByRole(...)` or `page.getByLabel(...)` for accessibility-driven selectors (these are complementary, not forbidden)

### Violations

```
await page.locator('.post-card').click();
```

```
await page.locator('button.submit').isVisible();
```

### Compliant

```
await page.getByTestId('post-card').click();
```

```
await page.getByTestId('submit-button').isVisible();
```
