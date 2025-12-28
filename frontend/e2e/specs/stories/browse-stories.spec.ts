import { test, expect, TEST_STORY_IDS } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Browse Stories', () => {
  test('displays published stories', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    // Should display story cards
    const storyCount = await homePage.getStoryCount();
    expect(storyCount).toBeGreaterThan(0);

    // Check a specific story card
    const publishedCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await expect(publishedCard.card).toBeVisible();
    await expect(publishedCard.title).toBeVisible();
  });

  test('published story shows read more button', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const publishedCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await expect(publishedCard.readMoreButton).toBeVisible();
  });

  test('draft story shows draft badge', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const draftCard = homePage.getStoryCard(TEST_STORY_IDS.DRAFT);
    await expect(draftCard.draftBadge).toBeVisible();
  });

  test('authenticated user sees edit button on stories', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await expect(storyCard.editButton).toBeVisible();
  });

  test('unauthenticated user does not see edit button', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await expect(storyCard.editButton).not.toBeVisible();
  });

  test('authenticated user sees delete button on draft stories', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    // Draft story should have delete button
    const draftCard = homePage.getStoryCard(TEST_STORY_IDS.DRAFT);
    await expect(draftCard.deleteButton).toBeVisible();

    // Published story should not have delete button
    const publishedCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await expect(publishedCard.deleteButton).not.toBeVisible();
  });

  test('clicking story title navigates to story detail', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickTitle();

    // Should navigate to story page
    expect(homePage.url).toContain('/stories/');
  });

  test('clicking read more navigates to story detail', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickReadMore();

    // Should navigate to story page
    expect(homePage.url).toContain('/stories/');
  });
});
