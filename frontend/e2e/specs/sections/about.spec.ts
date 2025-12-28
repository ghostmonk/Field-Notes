import { test, expect } from '../../fixtures';
import { AboutPage } from '../../page-objects/about.page';

test.describe('About Page', () => {
  test('displays page title', async ({ mockApiPage }) => {
    const aboutPage = new AboutPage(mockApiPage);

    await aboutPage.goto();
    await aboutPage.waitForContent();

    const title = await aboutPage.getPageTitle();
    expect(title).toBe('About Me');
  });

  test('displays page content from database', async ({ mockApiPage }) => {
    const aboutPage = new AboutPage(mockApiPage);

    await aboutPage.goto();
    await aboutPage.waitForContent();

    const content = await aboutPage.getContentText();
    expect(content).toContain('software developer');
    expect(content).toContain('passionate about building great products');
  });

  test('has correct page title in browser', async ({ mockApiPage }) => {
    const aboutPage = new AboutPage(mockApiPage);

    await aboutPage.goto();
    await aboutPage.waitForContent();

    const browserTitle = await aboutPage.getTitle();
    expect(browserTitle).toContain('About');
    expect(browserTitle).toContain('Turbulence');
  });

  test('navigation is visible', async ({ mockApiPage }) => {
    const aboutPage = new AboutPage(mockApiPage);

    await aboutPage.goto();

    await expect(aboutPage.nav.nav).toBeVisible();
    await expect(aboutPage.nav.blogLink).toBeVisible();
  });

  test('shows content card styling', async ({ mockApiPage }) => {
    const aboutPage = new AboutPage(mockApiPage);

    await aboutPage.goto();
    await aboutPage.waitForContent();

    await expect(aboutPage.contentCard).toBeVisible();
  });
});
