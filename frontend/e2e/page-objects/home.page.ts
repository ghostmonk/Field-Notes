import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';
import { StoryCardComponent, createStoryCard } from './components/story-card.component';

/**
 * Home page object for the stories list page.
 */
export class HomePage extends BasePage {
  readonly nav: TopNavComponent;

  // Stories list elements
  readonly storiesList: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;
  readonly retryButton: Locator;
  readonly endMessage: Locator;
  readonly createFirstStoryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);

    this.storiesList = page.getByTestId('stories-list');
    this.emptyState = page.getByTestId('stories-empty');
    this.errorState = page.getByTestId('stories-error');
    this.retryButton = page.getByTestId('stories-retry-button');
    this.endMessage = page.getByTestId('stories-end');
    this.createFirstStoryButton = page.getByTestId('create-first-story-button');
  }

  /**
   * Navigate to the home page.
   */
  async goto() {
    await super.goto('/');
  }

  /**
   * Wait for stories to load.
   * Waits for the container AND at least one story card to be visible.
   */
  async waitForStories() {
    await this.storiesList.waitFor({ state: 'visible' });
    // Wait for at least one story card to render inside the container
    await this.page.locator('[data-testid^="story-card-"]').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get a story card component by story ID.
   */
  getStoryCard(storyId: string): StoryCardComponent {
    return createStoryCard(this.page, storyId);
  }

  /**
   * Get all visible story cards.
   */
  async getStoryCards(): Promise<Locator[]> {
    const cards = this.page.locator('[data-testid^="story-card-"]');
    return cards.all();
  }

  /**
   * Get the number of visible stories.
   */
  async getStoryCount(): Promise<number> {
    const cards = await this.getStoryCards();
    return cards.length;
  }

  /**
   * Check if empty state is shown.
   */
  async hasEmptyState(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Check if error state is shown.
   */
  async hasErrorState(): Promise<boolean> {
    return this.errorState.isVisible();
  }

  /**
   * Click retry button in error state.
   */
  async clickRetry() {
    await this.retryButton.click();
  }

  /**
   * Click create first story button in empty state.
   */
  async clickCreateFirstStory() {
    await this.createFirstStoryButton.click();
  }

  /**
   * Check if end of list message is visible.
   */
  async hasReachedEnd(): Promise<boolean> {
    return this.endMessage.isVisible();
  }

  /**
   * Scroll to load more stories (infinite scroll).
   */
  async scrollToLoadMore() {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  /**
   * Wait for additional stories to load after scroll.
   */
  async waitForMoreStories(previousCount: number) {
    await this.page.waitForFunction(
      (count) => {
        const cards = document.querySelectorAll('[data-testid^="story-card-"]');
        return cards.length > count;
      },
      previousCount,
      { timeout: 5000 }
    );
  }
}
