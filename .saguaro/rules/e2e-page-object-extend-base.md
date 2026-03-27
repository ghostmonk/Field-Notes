<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: e2e-page-object-extend-base
title: E2E page objects must extend BasePage and use data-testid selectors
severity: warning
globs:
  - frontend/e2e/page-objects/**/*.ts
tags:
  - testing
  - e2e
  - page-objects
---

All page objects in `e2e/page-objects/` must extend `BasePage` from `./base.page`. Page objects that access page elements must use `this.getByTestId()` / `page.getByTestId()` rather than CSS selectors, XPath, or text-based locators — the Playwright config sets `testIdAttribute: 'data-testid'` globally.

Navigation methods should await the click, then assert the expected URL with `await page.waitForURL(...)`. Playwright's auto-waiting handles most navigation timing. Only use `Promise.all([page.waitForURL(...), locator.click()])` if you have a demonstrated race condition — add a comment explaining why.

Flag:
- Page object classes that do not extend `BasePage`
- `page.locator('.story-card')` or `page.locator('#submit')` instead of `page.getByTestId('...')`
- Navigation clicks without `waitForURL` guard

### Violations

```
export class NewPage {
  constructor(page) { this.page = page; }
  async getTitle() { return this.page.locator('h1').textContent(); }
}
```

### Compliant

```
export class NewPage extends BasePage {
  readonly title: Locator;
  constructor(page: Page) {
    super(page);
    this.title = page.getByTestId('page-title');
  }
}
```
