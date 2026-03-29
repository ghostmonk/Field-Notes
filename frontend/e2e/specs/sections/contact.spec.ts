import { test, expect } from '../../fixtures';
import { ContactPage } from '../../page-objects/contact.page';

test.describe('Contact Page', () => {
  test('displays page title', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();
    await contactPage.waitForContent();

    const title = await contactPage.getPageTitle();
    expect(title).toBe('Get In Touch');
  });

  test('displays page content from database', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();
    await contactPage.waitForContent();

    const content = await contactPage.getContentText();
    expect(content).toContain('reach out');
    expect(content).toContain('test@example.com');
  });

  test('has correct page title in browser', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();
    await contactPage.waitForContent();

    const browserTitle = await contactPage.getTitle();
    expect(browserTitle).toContain('Get In Touch');
    expect(browserTitle).toContain('Field Notes');
  });

  test('navigation is visible', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();

    await expect(contactPage.nav.nav).toBeVisible();
    await contactPage.nav.openMenu();
    await expect(contactPage.nav.blogLink).toBeVisible();
  });

  test('shows content card styling', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();
    await contactPage.waitForContent();

    await expect(contactPage.contentCard).toBeVisible();
  });

  test('contains clickable email link', async ({ mockApiPage }) => {
    const contactPage = new ContactPage(mockApiPage);

    await contactPage.goto();
    await contactPage.waitForContent();

    const emailLink = mockApiPage.getByRole('link', { name: 'test@example.com' });
    await expect(emailLink).toBeVisible();

    const href = await emailLink.getAttribute('href');
    expect(href).toBe('mailto:test@example.com');
  });
});
