import { test, expect } from '../../fixtures';
import { ProjectsPage } from '../../page-objects/projects.page';
import { ProjectDetailPage } from '../../page-objects/project-detail.page';
import { TEST_PROJECT_SLUGS } from '../../test-data';

test.describe('Projects Page', () => {
  test.describe('Projects Listing', () => {
    test('displays page title', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();

      const title = await projectsPage.getPageTitle();
      expect(title).toBe('Projects');
    });

    test('has correct page title in browser', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();

      const browserTitle = await projectsPage.getTitle();
      expect(browserTitle).toContain('Projects');
      expect(browserTitle).toContain('Field Notes');
    });

    test('displays project cards', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();
      await projectsPage.waitForProjects();

      const count = await projectsPage.getProjectCount();
      expect(count).toBe(3);
    });

    test('shows featured badge on featured projects', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();
      await projectsPage.waitForProjects();

      const isFeatured = await projectsPage.isProjectFeatured('Awesome Portfolio Site');
      expect(isFeatured).toBe(true);
    });

    test('does not show featured badge on regular projects', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();
      await projectsPage.waitForProjects();

      const isFeatured = await projectsPage.isProjectFeatured('API Integration Tool');
      expect(isFeatured).toBe(false);
    });

    test('clicking a project card navigates to detail page', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();
      await projectsPage.waitForProjects();
      await projectsPage.clickProject('Awesome Portfolio Site');

      expect(mockApiPage.url()).toContain('/projects/awesome-portfolio-site');
    });

    test('navigation is visible', async ({ mockApiPage }) => {
      const projectsPage = new ProjectsPage(mockApiPage);

      await projectsPage.goto();

      await expect(projectsPage.nav.nav).toBeVisible();
      await expect(projectsPage.nav.blogLink).toBeVisible();
    });
  });

  test.describe('Project Detail Page', () => {
    test('displays project title', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const title = await detailPage.getPageTitle();
      expect(title).toBe('Awesome Portfolio Site');
    });

    test('displays project summary', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const summary = await detailPage.getSummary();
      expect(summary).toContain('modern portfolio website');
    });

    test('displays project content', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const content = await detailPage.getContentText();
      expect(content).toContain('Features');
      expect(content).toContain('Dark mode');
    });

    test('shows featured badge for featured projects', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const isFeatured = await detailPage.isFeatured();
      expect(isFeatured).toBe(true);
    });

    test('does not show featured badge for regular projects', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.REGULAR);
      await detailPage.waitForContent();

      const isFeatured = await detailPage.isFeatured();
      expect(isFeatured).toBe(false);
    });

    test('shows GitHub button when URL is available', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const hasGithub = await detailPage.hasGithubLink();
      expect(hasGithub).toBe(true);

      const githubUrl = await detailPage.getGithubUrl();
      expect(githubUrl).toBe('https://github.com/example/portfolio');
    });

    test('shows Live Demo button when URL is available', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();

      const hasLive = await detailPage.hasLiveLink();
      expect(hasLive).toBe(true);

      const liveUrl = await detailPage.getLiveUrl();
      expect(liveUrl).toBe('https://example.com');
    });

    test('hides Live Demo button when URL is not available', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.REGULAR);
      await detailPage.waitForContent();

      const hasLive = await detailPage.hasLiveLink();
      expect(hasLive).toBe(false);
    });

    test('back link navigates to projects list', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto(TEST_PROJECT_SLUGS.FEATURED);
      await detailPage.waitForContent();
      await detailPage.goBackToProjects();

      expect(mockApiPage.url()).toContain('/projects');
      expect(mockApiPage.url()).not.toContain('/projects/');
    });

    test('shows not found for invalid slug', async ({ mockApiPage }) => {
      const detailPage = new ProjectDetailPage(mockApiPage);

      await detailPage.goto('non-existent-project');

      // Phase 5 catch-all returns notFound: true, showing Next.js 404 page
      await expect(mockApiPage.locator('text=404')).toBeVisible();
    });
  });
});
