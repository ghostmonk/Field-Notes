import { Page, Locator } from '@playwright/test';

/**
 * TopNav component page object.
 * Encapsulates navigation and auth-related interactions.
 */
export class TopNavComponent {
  readonly page: Page;

  // Navigation elements
  readonly nav: Locator;
  readonly newStoryLink: Locator;

  // Section links (desktop)
  readonly blogLink: Locator;
  readonly aboutLink: Locator;
  readonly projectsLink: Locator;
  readonly contactLink: Locator;

  // Auth elements
  readonly signInButton: Locator;
  readonly logoutButton: Locator;
  readonly userWelcome: Locator;

  // Mobile menu
  readonly mobileMenuToggle: Locator;
  readonly mobileMenu: Locator;
  readonly mobileNewStoryLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.nav = page.getByTestId('top-nav');
    this.newStoryLink = page.getByTestId('nav-new-story-link');

    // Section links
    this.blogLink = page.getByTestId('nav-blog-link');
    this.aboutLink = page.getByTestId('nav-about-link');
    this.projectsLink = page.getByTestId('nav-projects-link');
    this.contactLink = page.getByTestId('nav-contact-link');

    // Auth
    this.signInButton = page.getByTestId('signin-button');
    this.logoutButton = page.getByTestId('logout-button');
    this.userWelcome = page.getByTestId('user-welcome');

    // Mobile
    this.mobileMenuToggle = page.getByTestId('mobile-menu-toggle');
    this.mobileMenu = page.getByTestId('mobile-menu');
    this.mobileNewStoryLink = page.getByTestId('mobile-nav-new-story-link');
  }

  /**
   * Navigate to blog/home page via nav link.
   */
  async goToBlog() {
    await Promise.all([
      this.page.waitForURL('**/'),
      this.blogLink.click(),
    ]);
  }

  /**
   * Navigate to about page via nav link.
   */
  async goToAbout() {
    await Promise.all([
      this.page.waitForURL('**/about'),
      this.aboutLink.click(),
    ]);
  }

  /**
   * Navigate to projects page via nav link.
   */
  async goToProjects() {
    await Promise.all([
      this.page.waitForURL('**/projects'),
      this.projectsLink.click(),
    ]);
  }

  /**
   * Navigate to contact page via nav link.
   */
  async goToContact() {
    await Promise.all([
      this.page.waitForURL('**/contact'),
      this.contactLink.click(),
    ]);
  }

  /**
   * Navigate to new story page.
   */
  async goToNewStory() {
    await Promise.all([
      this.page.waitForURL('**/editor'),
      this.newStoryLink.click(),
    ]);
  }

  /**
   * Click sign in button.
   */
  async clickSignIn() {
    await this.signInButton.click();
  }

  /**
   * Click logout button.
   */
  async clickLogout() {
    await this.logoutButton.click();
  }

  /**
   * Check if user is authenticated (welcome message visible).
   */
  async isAuthenticated(): Promise<boolean> {
    return this.userWelcome.isVisible();
  }

  /**
   * Get the welcome message text.
   */
  async getWelcomeText(): Promise<string> {
    const text = await this.userWelcome.textContent();
    return text || '';
  }

  /**
   * Toggle mobile menu.
   */
  async toggleMobileMenu() {
    await this.mobileMenuToggle.click();
  }

  /**
   * Check if mobile menu is open.
   */
  async isMobileMenuOpen(): Promise<boolean> {
    return this.mobileMenu.isVisible();
  }
}
