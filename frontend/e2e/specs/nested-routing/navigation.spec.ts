import { test, expect, TEST_STORY_SLUGS, TEST_PROJECT_SLUGS } from '../../fixtures';
import { StoryDetailPage } from '../../page-objects/story-detail.page';
import { ProjectDetailPage } from '../../page-objects/project-detail.page';

test.describe('Nested Routing', () => {
  test('top-level section loads', async ({ mockApiPage }) => {
    await mockApiPage.goto('/blog');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('nested section loads via path', async ({ mockApiPage }) => {
    await mockApiPage.goto('/blog/tech');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('deep nested section loads via path', async ({ mockApiPage }) => {
    await mockApiPage.goto('/creative-work/photography/portraits');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('404 for nonexistent path', async ({ mockApiPage }) => {
    const response = await mockApiPage.goto('/does/not/exist');
    expect(response?.status()).toBe(404);
  });

  test('static page section loads', async ({ mockApiPage }) => {
    await mockApiPage.goto('/about');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('following redirect from old path to new path', async ({ mockApiPage }) => {
    await mockApiPage.goto('/old-blog/my-published-story');
    await expect(mockApiPage).toHaveURL(/\/blog\/my-published-story/);
    await expect(mockApiPage.locator('h1')).toContainText('My Published Story');
  });

  test.describe('Content Item Navigation', () => {
    test('navigating to story via section path loads story detail', async ({ page }) => {
      const storyPage = new StoryDetailPage(page);
      await storyPage.gotoBySlug(TEST_STORY_SLUGS.PUBLISHED);
      await storyPage.waitForStory();
      await expect(storyPage.article).toBeVisible();
      await expect(storyPage.title).toHaveText('My Published Story');
    });

    test('navigating to project via section path loads project detail', async ({ page }) => {
      const projectPage = new ProjectDetailPage(page);
      await projectPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await projectPage.waitForContent();
      await expect(projectPage.pageTitle).toHaveText(/Awesome Portfolio Site/);
    });
  });
});
