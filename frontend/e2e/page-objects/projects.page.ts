import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';
import { BottomNavComponent } from './components/bottom-nav.component';

/**
 * Projects page object for the projects listing page.
 */
export class ProjectsPage extends BasePage {
  readonly nav: TopNavComponent;
  readonly bottomNav: BottomNavComponent;

  // Page elements
  readonly pageTitle: Locator;
  readonly projectsGrid: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);
    this.bottomNav = new BottomNavComponent(page);

    this.pageTitle = page.locator('h1.page-title');
    this.projectsGrid = page.locator('.grid');
    this.loadingState = page.getByText('Loading projects...');
    this.errorState = page.getByText('Failed to load projects');
    this.emptyState = page.getByText('No projects yet');
  }

  /**
   * Navigate to the projects page.
   */
  async goto() {
    await super.goto('/projects');
  }

  /**
   * Wait for projects to load.
   */
  async waitForProjects() {
    await this.projectsGrid.waitFor({ state: 'visible' });
    // Wait for at least one project card to render
    await this.page.locator('.card').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get the page title text.
   */
  async getPageTitle(): Promise<string> {
    const text = await this.pageTitle.textContent();
    return text || '';
  }

  /**
   * Get all project cards.
   */
  async getProjectCards(): Promise<Locator[]> {
    const cards = this.projectsGrid.locator('.card');
    return cards.all();
  }

  /**
   * Get the number of visible projects.
   */
  async getProjectCount(): Promise<number> {
    const cards = await this.getProjectCards();
    return cards.length;
  }

  /**
   * Click on a project card by title.
   */
  async clickProject(title: string) {
    const card = this.projectsGrid.locator('.card', { hasText: title });
    await Promise.all([
      this.page.waitForURL('**/projects/**'),
      card.click(),
    ]);
  }

  /**
   * Check if a project has the featured badge.
   */
  async isProjectFeatured(title: string): Promise<boolean> {
    const card = this.projectsGrid.locator('.card', { hasText: title });
    const badge = card.getByText('Featured');
    return badge.isVisible();
  }

  /**
   * Get technologies for a project by title.
   */
  async getProjectTechnologies(title: string): Promise<string[]> {
    const card = this.projectsGrid.locator('.card', { hasText: title });
    const techSpans = card.locator('span').filter({ hasNotText: 'Featured' });
    const texts = await techSpans.allTextContents();
    // Filter out the project title and summary
    return texts.filter(t => t.length < 30);
  }

  /**
   * Check if loading state is shown.
   */
  async isLoading(): Promise<boolean> {
    return this.loadingState.isVisible();
  }

  /**
   * Check if error state is shown.
   */
  async hasError(): Promise<boolean> {
    return this.errorState.isVisible();
  }

  /**
   * Check if empty state is shown.
   */
  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible();
  }
}
