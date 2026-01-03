import { test, expect, TEST_STORY_IDS } from '../../fixtures';
import { StoryDetailPage } from '../../page-objects/story-detail.page';
import { HomePage } from '../../page-objects/home.page';

/**
 * Engagement system tests (reactions and comments).
 *
 * Tests the rendering of reactions and comments on story pages,
 * including proper HTML entity decoding for XSS protection.
 *
 * Note: Tests use client-side navigation (mockApiPage) to load stories,
 * since SSR tests require additional mock server configuration.
 */
test.describe('Engagement System', () => {
  /**
   * Helper to navigate to the published story via client-side navigation.
   * This ensures API mocks are properly applied.
   */
  async function navigateToPublishedStory(page: import('@playwright/test').Page) {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForStories();

    // Click on the published story to navigate
    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickTitle();

    // Wait for story page to load
    const storyPage = new StoryDetailPage(page);
    await storyPage.waitForStory();

    return storyPage;
  }

  test.describe('Reactions', () => {
    test('displays reaction counts on story page', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Check that reaction buttons are visible with counts
      // The buttons contain the emoji and count as separate elements
      await expect(mockApiPage.locator('button:has-text("👍")')).toBeVisible();
      await expect(mockApiPage.locator('button:has-text("❤️")')).toBeVisible();

      // Verify the counts are showing
      await expect(mockApiPage.locator('text="3"')).toBeVisible();
      await expect(mockApiPage.locator('text="2"')).toBeVisible();
    });

    test('shows add reaction button for authenticated users', async ({ mockAuthenticatedApiPage }) => {
      await navigateToPublishedStory(mockAuthenticatedApiPage);

      // The + button should be visible for authenticated users
      const addReactionButton = mockAuthenticatedApiPage.locator('button:has-text("+")');
      await expect(addReactionButton).toBeVisible();
    });
  });

  test.describe('Comments', () => {
    test('displays comments section on story page', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Check that comments section exists with count
      const commentsSection = mockApiPage.locator('h3:has-text("Comments")');
      await expect(commentsSection).toBeVisible();
    });

    test('displays comment content correctly', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Wait for comments to load
      await mockApiPage.waitForSelector('text=Great story!');

      // Check that regular comment is displayed
      await expect(mockApiPage.locator('text=Great story!')).toBeVisible();
    });

    test('displays reply to comment', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Wait for comments to load
      await mockApiPage.waitForSelector('text=I agree!');

      // Check that reply is displayed
      await expect(mockApiPage.locator('text=I agree!')).toBeVisible();
    });

    test('displays special characters in comment content correctly', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Wait for comments to load
      // Raw content stored: Let's go! <script>alert('xss')</script>
      // React auto-escapes on render, displaying script as text (not executed)
      await mockApiPage.waitForSelector("text=Let's go!");

      // Verify the apostrophe displays correctly
      await expect(mockApiPage.locator("text=Let's go!")).toBeVisible();

      // Verify the script tag is displayed as text (not executed)
      // If XSS was possible, there would be an alert and the text wouldn't be visible
      await expect(mockApiPage.locator('text=<script>')).toBeVisible();
    });

    test('displays special characters in user names correctly', async ({ mockApiPage }) => {
      await navigateToPublishedStory(mockApiPage);

      // Wait for comments to load
      // Raw content stored: O'Brien
      // Displays correctly via React rendering
      await mockApiPage.waitForSelector("text=O'Brien");

      // Verify the apostrophe in the name displays correctly
      await expect(mockApiPage.locator("text=O'Brien")).toBeVisible();
    });

    test('shows reply button for authenticated users', async ({ mockAuthenticatedApiPage }) => {
      await navigateToPublishedStory(mockAuthenticatedApiPage);

      // Wait for comments to load
      await mockAuthenticatedApiPage.waitForSelector('text=Great story!');

      // Reply button should be visible for authenticated users
      const replyButton = mockAuthenticatedApiPage.locator('button:has-text("Reply")').first();
      await expect(replyButton).toBeVisible();
    });

    test('can open reply form', async ({ mockAuthenticatedApiPage }) => {
      await navigateToPublishedStory(mockAuthenticatedApiPage);

      // Wait for comments to load
      await mockAuthenticatedApiPage.waitForSelector('text=Great story!');

      // Click reply button
      const replyButton = mockAuthenticatedApiPage.locator('button:has-text("Reply")').first();
      await replyButton.click();

      // Reply textarea should appear
      const replyTextarea = mockAuthenticatedApiPage.locator('textarea[placeholder="Write a reply..."]');
      await expect(replyTextarea).toBeVisible();
    });

    test('can submit a new comment', async ({ mockAuthenticatedApiPage }) => {
      await navigateToPublishedStory(mockAuthenticatedApiPage);

      // Wait for comments section to load
      await mockAuthenticatedApiPage.waitForSelector('h3:has-text("Comments")');

      // Find the main comment textarea and type a comment
      const commentTextarea = mockAuthenticatedApiPage.locator('textarea[placeholder="Write a comment..."]');
      await commentTextarea.fill('This is a test comment');

      // Click post button
      const postButton = mockAuthenticatedApiPage.locator('button:has-text("Post")');
      await postButton.click();

      // The textarea should be cleared after successful submission
      await expect(commentTextarea).toHaveValue('');
    });
  });

  test.describe('XSS Protection', () => {
    test('script tags in comments are displayed as text, not executed', async ({ mockApiPage }) => {
      const storyPage = await navigateToPublishedStory(mockApiPage);

      // If XSS was possible, an alert would have been triggered
      // and subsequent operations might fail. We verify the page
      // still works normally and the "script" text is visible.
      await mockApiPage.waitForSelector('text=<script>');

      // Page should still be functional
      await expect(storyPage.article).toBeVisible();
      await expect(storyPage.title).toBeVisible();

      // The escaped script content should be visible as text
      const scriptText = mockApiPage.locator("text=alert('xss')");
      await expect(scriptText).toBeVisible();
    });
  });
});
