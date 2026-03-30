import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Smoke Tests', () => {
  test('home page loads and displays navigation', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify navigation is visible
    await expect(homePage.nav.nav).toBeVisible();
    await homePage.nav.openMenu();
    await expect(homePage.nav.blogLink).toBeVisible();

    // Verify page title
    const title = await homePage.getTitle();
    expect(title).toContain('Ghostmonk');
  });

  test('home link with site title is visible in navigation', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForLoad();
    await expect(homePage.nav.homeLink).toBeVisible();
    await expect(homePage.nav.homeLink.locator('svg')).toBeVisible();
  });

  test('home page displays stories list', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    // Verify stories are displayed
    const storyCount = await homePage.getStoryCount();
    expect(storyCount).toBeGreaterThan(0);
  });

  test('unauthenticated user sees sign in button', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify sign in button is visible
    await expect(homePage.nav.signInButton).toBeVisible();

    // Verify logout button is not visible
    await expect(homePage.nav.logoutButton).not.toBeVisible();
  });

  test('authenticated user sees logout button', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify logout button is visible
    await expect(homePage.nav.logoutButton).toBeVisible();

    // Verify sign in button is not visible
    await expect(homePage.nav.signInButton).not.toBeVisible();
  });

  test('authenticated user sees New Story link', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify New content link is visible (inside mobile menu overlay)
    await homePage.nav.openMenu();
    await expect(homePage.nav.newContentLink).toBeVisible();
  });

  test('navigation links work correctly', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Click blog link (home)
    await homePage.nav.goToBlog();

    // Should still be on home page
    expect(homePage.url).toMatch(/\/(blog)?$/);
  });

  test('skip to content link is accessible via keyboard', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForLoad();

    // Tab into the page — skip link should become visible
    await mockApiPage.keyboard.press('Tab');
    const skipLink = mockApiPage.getByTestId('skip-to-content');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
  });

  test('all section links are present', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Section links are inside the mobile menu overlay
    await homePage.nav.openMenu();
    await expect(homePage.nav.blogLink).toBeVisible();
    await expect(homePage.nav.aboutLink).toBeVisible();
    await expect(homePage.nav.projectsLink).toBeVisible();
    await expect(homePage.nav.contactLink).toBeVisible();
  });
});
