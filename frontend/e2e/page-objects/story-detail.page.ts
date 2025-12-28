import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';

/**
 * Story detail page object for viewing individual stories.
 */
export class StoryDetailPage extends BasePage {
  readonly nav: TopNavComponent;

  // Article elements
  readonly article: Locator;
  readonly title: Locator;
  readonly content: Locator;
  readonly backLink: Locator;

  // Error state
  readonly errorContainer: Locator;
  readonly errorHomeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);

    this.article = page.getByTestId('story-article');
    this.title = page.getByTestId('story-page-title');
    this.content = page.getByTestId('story-content');
    this.backLink = page.getByTestId('story-back-link');
    this.errorContainer = page.getByTestId('story-error');
    this.errorHomeLink = page.getByTestId('story-error-home-link');
  }

  /**
   * Navigate to a story by slug.
   */
  async gotoBySlug(slug: string) {
    await super.goto(`/stories/${slug}`);
  }

  /**
   * Navigate to a story by ID.
   */
  async gotoById(id: string) {
    await super.goto(`/stories/${id}`);
  }

  /**
   * Wait for story article to load.
   */
  async waitForStory() {
    await this.article.waitFor({ state: 'visible' });
  }

  /**
   * Get story title text.
   */
  async getTitleText(): Promise<string> {
    const text = await this.title.textContent();
    return text || '';
  }

  /**
   * Get story content HTML.
   */
  async getContentHTML(): Promise<string> {
    return this.content.innerHTML();
  }

  /**
   * Click back to all stories link and wait for navigation.
   */
  async goBack() {
    await Promise.all([
      this.page.waitForURL('**/'),
      this.backLink.click(),
    ]);
  }

  /**
   * Check if error state is shown.
   */
  async hasError(): Promise<boolean> {
    return this.errorContainer.isVisible();
  }

  /**
   * Click home link in error state and wait for navigation.
   */
  async clickErrorHomeLink() {
    await Promise.all([
      this.page.waitForURL('**/'),
      this.errorHomeLink.click(),
    ]);
  }

  /**
   * Check if story is loaded successfully.
   */
  async isLoaded(): Promise<boolean> {
    return this.article.isVisible();
  }
}
