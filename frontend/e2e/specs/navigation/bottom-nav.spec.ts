import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Bottom Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('bottom nav shows home link', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForLoad();
    await expect(homePage.bottomNav.homeLink).toBeVisible();
  });
});
