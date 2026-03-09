import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';
import { AboutPage } from '../../page-objects/about.page';
import { ContactPage } from '../../page-objects/contact.page';
import { ProjectsPage } from '../../page-objects/projects.page';

test.describe('Section Navigation', () => {
  test.describe('Menu Navigation', () => {
    test('displays all section links in menu', async ({ mockApiPage }) => {
      const homePage = new HomePage(mockApiPage);

      await homePage.goto();
      await homePage.nav.openMenu();

      // Verify all section links are visible in the menu overlay
      await expect(homePage.nav.blogLink).toBeVisible();
      await expect(homePage.nav.aboutLink).toBeVisible();
      await expect(homePage.nav.projectsLink).toBeVisible();
      await expect(homePage.nav.contactLink).toBeVisible();
    });

    test('navigates to About page', async ({ mockApiPage }) => {
      const homePage = new HomePage(mockApiPage);

      await homePage.goto();
      await homePage.nav.goToAbout();

      expect(mockApiPage.url()).toContain('/about');
    });

    test('navigates to Projects page', async ({ mockApiPage }) => {
      const homePage = new HomePage(mockApiPage);

      await homePage.goto();
      await homePage.nav.goToProjects();

      expect(mockApiPage.url()).toContain('/projects');
    });

    test('navigates to Contact page', async ({ mockApiPage }) => {
      const homePage = new HomePage(mockApiPage);

      await homePage.goto();
      await homePage.nav.goToContact();

      expect(mockApiPage.url()).toContain('/contact');
    });

    test('navigates back to Blog from another section', async ({ mockApiPage }) => {
      const aboutPage = new AboutPage(mockApiPage);

      await aboutPage.goto();
      await aboutPage.nav.goToBlog();

      expect(mockApiPage.url()).toMatch(/\/(blog)?$/);
    });
  });

  test.describe('Cross-section Navigation', () => {
    test('can navigate from About to Projects', async ({ mockApiPage }) => {
      const aboutPage = new AboutPage(mockApiPage);

      await aboutPage.goto();
      await aboutPage.nav.goToProjects();

      expect(mockApiPage.url()).toContain('/projects');
    });

    test('can navigate from Projects to Contact', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();
      await projectsPage.nav.goToContact();

      expect(mockApiPage.url()).toContain('/contact');
    });

    test('can navigate from Contact to Blog', async ({ mockApiPage }) => {
      const contactPage = new ContactPage(mockApiPage);

      await contactPage.goto();
      await contactPage.nav.goToBlog();

      expect(mockApiPage.url()).toMatch(/\/(blog)?$/);
    });
  });
});
