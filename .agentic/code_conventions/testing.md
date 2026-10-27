# Testing Conventions

## E2E Selector Strategy

Playwright tests use `data-testid` as the canonical selector (`testIdAttribute: 'data-testid'` in `playwright.config.ts`). Use `page.getByTestId()` — never CSS class selectors (`page.locator('.some-class')`) or bare element-type selectors (`page.locator('button')`). `page.getByRole()` and `page.getByLabel()` are acceptable as complementary accessibility selectors.

## data-testid on Interactive Elements

New interactive elements — buttons, links, form inputs, list containers, empty/error states — must have a `data-testid` attribute. Naming conventions:
- Entity-scoped: `story-card-{id}`, `story-edit-{id}`, `story-delete-{id}`
- Containers: `stories-list`, `stories-empty`, `stories-error`
- Nav: `top-nav`, `nav-{section}-link`, `hamburger-button`
- Actions: `confirm-dialog`, `confirm-ok`, `confirm-cancel`

## Page Objects

All page objects in `e2e/page-objects/` must extend `BasePage` from `./base.page`. Use `this.getByTestId()` / `page.getByTestId()` for element access. Navigation methods should await the click then assert the expected URL with `page.waitForURL()`.

## Test Data

E2E test data lives in `e2e/test-data.ts` and is shared between the Express mock server (`e2e/mock-server.ts`, SSR on port 5555) and Playwright `page.route()` client-side mocks. Do not hardcode response objects inline. Use `TEST_STORY_IDS`, `TEST_PROJECT_IDS`, `TEST_SECTION_IDS` constants and `createTest*()` factory helpers. Keeping both sources in sync prevents SSR/client hydration mismatches.
