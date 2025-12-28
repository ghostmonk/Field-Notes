import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Smoke Tests', () => {
  test('home page loads and displays navigation', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();

    // Verify navigation is visible
    await expect(homePage.nav.nav).toBeVisible();
    await expect(homePage.nav.homeLink).toBeVisible();

    // Verify page title
    const title = await homePage.getTitle();
    expect(title).toContain('Turbulence');
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

    // Verify sign in button is visible
    await expect(homePage.nav.signInButton).toBeVisible();

    // Verify logout button is not visible
    await expect(homePage.nav.logoutButton).not.toBeVisible();
  });

  test('authenticated user sees welcome message and logout', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();

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

    // Verify New Story link is visible
    await expect(homePage.nav.newStoryLink).toBeVisible();
  });

  test('navigation links work correctly', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);

    await homePage.goto();

    // Click home link
    await homePage.nav.goHome();

    // Should still be on home page
    expect(homePage.url).toContain('/');
  });
});
