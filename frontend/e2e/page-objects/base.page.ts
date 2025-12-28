import { Page, Locator } from '@playwright/test';

/**
 * Base page object with common functionality.
 * All page objects should extend this class.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path relative to the base URL.
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test ID.
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Click element by test ID.
   */
  async clickByTestId(testId: string) {
    await this.getByTestId(testId).click();
  }

  /**
   * Fill input by test ID.
   */
  async fillByTestId(testId: string, value: string) {
    await this.getByTestId(testId).fill(value);
  }

  /**
   * Check if element is visible by test ID.
   */
  async isVisibleByTestId(testId: string): Promise<boolean> {
    return this.getByTestId(testId).isVisible();
  }

  /**
   * Wait for element to be visible by test ID.
   */
  async waitForTestId(testId: string, options?: { timeout?: number }) {
    await this.getByTestId(testId).waitFor({ state: 'visible', ...options });
  }

  /**
   * Get the current page URL.
   */
  get url(): string {
    return this.page.url();
  }

  /**
   * Get the current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
