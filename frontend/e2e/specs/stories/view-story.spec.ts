import { test, expect, TEST_STORY_IDS, TEST_STORY_SLUGS } from '../../fixtures';
import { StoryDetailPage } from '../../page-objects/story-detail.page';
import { HomePage } from '../../page-objects/home.page';

/**
 * Story detail page tests.
 *
 * Note: Direct SSR tests are skipped as they require the mock server
 * to be reachable from Next.js server-side, which needs additional setup.
 * Navigation-based tests that use client-side routing work with API mocking.
 */
test.describe('View Story', () => {
  test('navigating to story from home page works', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForStories();

    // Click on a story to navigate
    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickTitle();

    // Verify URL changed to story page
    expect(homePage.url).toContain('/stories/');
  });

  test('clicking read more navigates to story', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForStories();

    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickReadMore();

    expect(homePage.url).toContain('/stories/');
  });

  // SSR tests - these use the mock server (not page.route interception)
  test.describe('SSR Tests', () => {
    test('displays story content from mock server', async ({ page }) => {
      const storyPage = new StoryDetailPage(page);
      await storyPage.gotoBySlug(TEST_STORY_SLUGS.PUBLISHED);
      await storyPage.waitForStory();
      await expect(storyPage.article).toBeVisible();
      await expect(storyPage.title).toHaveText('My Published Story');
    });

    test('shows error for non-existent story', async ({ page }) => {
      const storyPage = new StoryDetailPage(page);
      await storyPage.gotoBySlug('non-existent-story');
      await expect(storyPage.errorContainer).toBeVisible();
    });
  });
});
