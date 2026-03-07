import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Smoke Tests', () => {
  test('home page loads and displays navigation', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify navigation is visible
    await expect(homePage.nav.nav).toBeVisible();
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
    await expect(homePage.nav.homeLink).toHaveText('Ghostmonk');
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

  test('authenticated user sees welcome message and logout', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify welcome message is visible
    await expect(homePage.nav.userWelcome).toBeVisible();

    // Verify logout button is visible
    await expect(homePage.nav.logoutButton).toBeVisible();

    // Verify sign in button is not visible
    await expect(homePage.nav.signInButton).not.toBeVisible();
  });

  test('authenticated user sees New Story link', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify New content link is visible
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

  test('unauthenticated user does not see mobile menu toggle', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForLoad();
    await expect(homePage.nav.mobileMenuToggle).not.toBeVisible();
  });

  test('authenticated admin user sees mobile menu toggle', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);
    await homePage.goto();
    await homePage.waitForLoad();
    await expect(homePage.nav.mobileMenuToggle).toBeVisible();
  });

  test('all section links are present', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();
    await homePage.waitForLoad();

    // Verify all section links are visible
    await expect(homePage.nav.blogLink).toBeVisible();
    await expect(homePage.nav.aboutLink).toBeVisible();
    await expect(homePage.nav.projectsLink).toBeVisible();
    await expect(homePage.nav.contactLink).toBeVisible();
  });
});
