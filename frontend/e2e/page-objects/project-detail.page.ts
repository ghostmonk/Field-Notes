import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';
import { BottomNavComponent } from './components/bottom-nav.component';

/**
 * Project detail page object for individual project pages.
 */
export class ProjectDetailPage extends BasePage {
  readonly nav: TopNavComponent;
  readonly bottomNav: BottomNavComponent;

  // Page elements
  readonly pageTitle: Locator;
  readonly backLink: Locator;
  readonly featuredBadge: Locator;
  readonly summary: Locator;
  readonly technologiesList: Locator;
  readonly githubButton: Locator;
  readonly liveButton: Locator;
  readonly contentCard: Locator;
  readonly content: Locator;
  readonly projectImage: Locator;
  readonly loadingState: Locator;
  readonly errorState: Locator;
  readonly notFoundState: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);
    this.bottomNav = new BottomNavComponent(page);

    this.pageTitle = page.locator('h1.page-title');
    this.backLink = page.getByText('← Back to Projects');
    this.featuredBadge = page.locator('h1').getByText('Featured');
    this.summary = page.locator('p.text-text-secondary').first();
    this.technologiesList = page.locator('div').filter({ has: page.locator('span') }).first();
    this.githubButton = page.getByRole('link', { name: 'View on GitHub' });
    this.liveButton = page.getByRole('link', { name: 'Live Demo' });
    this.contentCard = page.locator('.card');
    this.content = page.locator('.prose');
    this.projectImage = page.locator('img').first();
    this.loadingState = page.getByText('Loading project...');
    this.errorState = page.getByText('Failed to load project');
    this.notFoundState = page.getByRole('heading', { name: 'Project Not Found' });
  }

  /**
   * Navigate to a project detail page by slug.
   */
  async goto(slug: string) {
    await super.goto(`/projects/${slug}`);
  }

  /**
   * Wait for project content to load.
   */
  async waitForContent() {
    await this.content.waitFor({ state: 'visible' });
  }

  /**
   * Get the page title text.
   */
  async getPageTitle(): Promise<string> {
    const text = await this.pageTitle.textContent();
    // Remove "Featured" badge text if present
    return (text || '').replace('Featured', '').trim();
  }

  /**
   * Get the project summary text.
   */
  async getSummary(): Promise<string> {
    const text = await this.summary.textContent();
    return text || '';
  }

  /**
   * Get the project content text.
   */
  async getContentText(): Promise<string> {
    const text = await this.content.textContent();
    return text || '';
  }

  /**
   * Check if project is featured.
   */
  async isFeatured(): Promise<boolean> {
    return this.featuredBadge.isVisible();
  }

  /**
   * Check if GitHub button is visible.
   */
  async hasGithubLink(): Promise<boolean> {
    return this.githubButton.isVisible();
  }

  /**
   * Check if Live Demo button is visible.
   */
  async hasLiveLink(): Promise<boolean> {
    return this.liveButton.isVisible();
  }

  /**
   * Get the GitHub URL.
   */
  async getGithubUrl(): Promise<string | null> {
    if (!(await this.hasGithubLink())) return null;
    return this.githubButton.getAttribute('href');
  }

  /**
   * Get the Live Demo URL.
   */
  async getLiveUrl(): Promise<string | null> {
    if (!(await this.hasLiveLink())) return null;
    return this.liveButton.getAttribute('href');
  }

  /**
   * Check if project has an image.
   */
  async hasImage(): Promise<boolean> {
    return this.projectImage.isVisible();
  }

  /**
   * Click back to projects link.
   */
  async goBackToProjects() {
    await Promise.all([
      this.page.waitForURL('**/projects'),
      this.backLink.click(),
    ]);
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
   * Check if not found state is shown.
   */
  async isNotFound(): Promise<boolean> {
    return this.notFoundState.isVisible();
  }
}
