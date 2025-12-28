import { Page, Locator } from '@playwright/test';

/**
 * Story card component page object.
 * Represents a single story card in the stories list.
 */
export class StoryCardComponent {
  readonly page: Page;
  readonly storyId: string;

  // Card elements (dynamic based on story ID)
  readonly card: Locator;
  readonly title: Locator;
  readonly titleLink: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly draftBadge: Locator;
  readonly readMoreButton: Locator;
  readonly contentLink: Locator;

  constructor(page: Page, storyId: string) {
    this.page = page;
    this.storyId = storyId;

    this.card = page.getByTestId(`story-card-${storyId}`);
    this.title = page.getByTestId(`story-title-${storyId}`);
    this.titleLink = page.getByTestId(`story-title-link-${storyId}`);
    this.editButton = page.getByTestId(`story-edit-${storyId}`);
    this.deleteButton = page.getByTestId(`story-delete-${storyId}`);
    this.draftBadge = page.getByTestId(`story-draft-badge-${storyId}`);
    this.readMoreButton = page.getByTestId(`story-read-more-${storyId}`);
    this.contentLink = page.getByTestId(`story-content-link-${storyId}`);
  }

  /**
   * Get the story title text.
   */
  async getTitleText(): Promise<string> {
    const text = await this.title.textContent();
    return text || '';
  }

  /**
   * Check if story is a draft.
   */
  async isDraft(): Promise<boolean> {
    return this.draftBadge.isVisible();
  }

  /**
   * Click edit button and wait for navigation.
   */
  async clickEdit() {
    await Promise.all([
      this.page.waitForURL('**/editor**'),
      this.editButton.click(),
    ]);
  }

  /**
   * Click delete button.
   */
  async clickDelete() {
    await this.deleteButton.click();
  }

  /**
   * Click to read full story and wait for navigation.
   */
  async clickReadMore() {
    await Promise.all([
      this.page.waitForURL('**/stories/**'),
      this.readMoreButton.click(),
    ]);
  }

  /**
   * Click title to navigate to story and wait for navigation.
   */
  async clickTitle() {
    await Promise.all([
      this.page.waitForURL('**/stories/**'),
      this.titleLink.click(),
    ]);
  }

  /**
   * Check if card is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.card.isVisible();
  }

  /**
   * Check if edit button is visible (authenticated).
   */
  async canEdit(): Promise<boolean> {
    return this.editButton.isVisible();
  }

  /**
   * Check if delete button is visible (authenticated + draft).
   */
  async canDelete(): Promise<boolean> {
    return this.deleteButton.isVisible();
  }
}

/**
 * Factory to create StoryCard components for stories in the list.
 */
export function createStoryCard(page: Page, storyId: string): StoryCardComponent {
  return new StoryCardComponent(page, storyId);
}
