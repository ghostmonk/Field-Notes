import { Page, Locator } from '@playwright/test';

/**
 * BottomNav component page object.
 * Encapsulates mobile bottom navigation interactions.
 */
export class BottomNavComponent {
  readonly page: Page;

  // Navigation container
  readonly nav: Locator;

  // Section links
  readonly blogLink: Locator;
  readonly aboutLink: Locator;
  readonly projectsLink: Locator;
  readonly contactLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation container
    this.nav = page.getByTestId('bottom-nav');

    // Section links
    this.blogLink = page.getByTestId('bottom-nav-blog');
    this.aboutLink = page.getByTestId('bottom-nav-about');
    this.projectsLink = page.getByTestId('bottom-nav-projects');
    this.contactLink = page.getByTestId('bottom-nav-contact');
  }

  /**
   * Check if bottom nav is visible (should only show on mobile).
   */
  async isVisible(): Promise<boolean> {
    return this.nav.isVisible();
  }

  /**
   * Navigate to blog/home page via bottom nav.
   */
  async goToBlog() {
    await Promise.all([
      this.page.waitForURL(/\/(blog)?$/),
      this.blogLink.click(),
    ]);
  }

  /**
   * Navigate to about page via bottom nav.
   */
  async goToAbout() {
    await Promise.all([
      this.page.waitForURL('**/about'),
      this.aboutLink.click(),
    ]);
  }

  /**
   * Navigate to projects page via bottom nav.
   */
  async goToProjects() {
    await Promise.all([
      this.page.waitForURL('**/projects'),
      this.projectsLink.click(),
    ]);
  }

  /**
   * Navigate to contact page via bottom nav.
   */
  async goToContact() {
    await Promise.all([
      this.page.waitForURL('**/contact'),
      this.contactLink.click(),
    ]);
  }

  /**
   * Check if a specific section link is active.
   */
  async isActive(section: 'blog' | 'about' | 'projects' | 'contact'): Promise<boolean> {
    const linkMap = {
      blog: this.blogLink,
      about: this.aboutLink,
      projects: this.projectsLink,
      contact: this.contactLink,
    };
    const link = linkMap[section];
    const className = await link.getAttribute('class');
    return className?.includes('--active') || false;
  }
}
