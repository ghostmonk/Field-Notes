import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';
import { BottomNavComponent } from './components/bottom-nav.component';

/**
 * Contact page object for the contact page.
 */
export class ContactPage extends BasePage {
  readonly nav: TopNavComponent;
  readonly bottomNav: BottomNavComponent;

  // Page elements
  readonly pageTitle: Locator;
  readonly contentCard: Locator;
  readonly content: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);
    this.bottomNav = new BottomNavComponent(page);

    this.pageTitle = page.locator('h1.page-title');
    this.contentCard = page.locator('.card');
    this.content = page.locator('.prose');
    this.loadingState = page.getByText('Loading...');
    this.errorState = page.getByText(/Page not found|Failed to load/);
  }

  /**
   * Navigate to the contact page.
   */
  async goto() {
    await super.goto('/contact');
  }

  /**
   * Wait for page content to load.
   */
  async waitForContent() {
    await this.content.waitFor({ state: 'visible' });
  }

  /**
   * Get the page title text.
   */
  async getPageTitle(): Promise<string> {
    const text = await this.pageTitle.textContent();
    return text || '';
  }

  /**
   * Get the page content text.
   */
  async getContentText(): Promise<string> {
    const text = await this.content.textContent();
    return text || '';
  }

  /**
   * Check if loading state is shown.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible();
  }

  /**
   * Check if error state is shown.
   */
  async hasError(): Promise<boolean> {
    return this.errorState.isVisible();
  }
}
