import { Page, Locator } from '@playwright/test';

/**
 * TopNav component page object.
 * Encapsulates navigation and auth-related interactions.
 */
export class TopNavComponent {
  readonly page: Page;

  // Navigation elements
  readonly nav: Locator;
  readonly homeLink: Locator;
  readonly newStoryLink: Locator;

  // Auth elements
  readonly signInButton: Locator;
  readonly logoutButton: Locator;
  readonly userWelcome: Locator;

  // Mobile menu
  readonly mobileMenuToggle: Locator;
  readonly mobileMenu: Locator;
  readonly mobileHomeLink: Locator;
  readonly mobileNewStoryLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.nav = page.getByTestId('top-nav');
    this.homeLink = page.getByTestId('nav-home-link');
    this.newStoryLink = page.getByTestId('nav-new-story-link');

    // Auth
    this.signInButton = page.getByTestId('signin-button');
    this.logoutButton = page.getByTestId('logout-button');
    this.userWelcome = page.getByTestId('user-welcome');

    // Mobile
    this.mobileMenuToggle = page.getByTestId('mobile-menu-toggle');
    this.mobileMenu = page.getByTestId('mobile-menu');
    this.mobileHomeLink = page.getByTestId('mobile-nav-home-link');
    this.mobileNewStoryLink = page.getByTestId('mobile-nav-new-story-link');
  }

  /**
   * Navigate to home page via nav link.
   */
  async goHome() {
    await Promise.all([
      this.page.waitForURL('**/'),
      this.homeLink.click(),
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
