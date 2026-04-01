import { Page, Locator } from '@playwright/test';

export class TopNavComponent {
  readonly page: Page;

  // Header elements
  readonly nav: Locator;
  readonly homeLink: Locator;
  readonly hamburgerButton: Locator;
  readonly menuOverlay: Locator;

  // Section links (inside menu overlay)
  readonly blogLink: Locator;
  readonly aboutLink: Locator;
  readonly projectsLink: Locator;
  readonly contactLink: Locator;

  // Admin links (inside menu overlay)
  readonly masterControlLink: Locator;

  // Auth elements (in header)
  readonly signInButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.nav = page.getByTestId('top-nav');
    this.homeLink = page.getByTestId('nav-home-link');
    this.hamburgerButton = page.getByTestId('hamburger-button');
    this.menuOverlay = page.getByTestId('menu-overlay');

    // Section links (same testids, now in overlay)
    this.blogLink = page.getByTestId('nav-blog-link');
    this.aboutLink = page.getByTestId('nav-about-link');
    this.projectsLink = page.getByTestId('nav-projects-link');
    this.contactLink = page.getByTestId('nav-contact-link');

    // Admin links
    this.masterControlLink = page.getByTestId('nav-master-control-link');

    // Auth
    this.signInButton = page.getByTestId('signin-button');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async openMenu() {
    const isOpen = await this.hamburgerButton.getAttribute('aria-expanded') === 'true';
    if (!isOpen) {
      await this.hamburgerButton.click();
      await this.menuOverlay.waitFor({ state: 'visible' });
    }
  }

  async closeMenu() {
    const isOpen = await this.hamburgerButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      await this.hamburgerButton.click();
      await this.menuOverlay.waitFor({ state: 'hidden' });
    }
  }

  async goToBlog() {
    await this.openMenu();
    await Promise.all([
      this.page.waitForURL(/\/(blog)?$/),
      this.blogLink.click(),
    ]);
  }

  async goToAbout() {
    await this.openMenu();
    await Promise.all([
      this.page.waitForURL('**/about'),
      this.aboutLink.click(),
    ]);
  }

  async goToProjects() {
    await this.openMenu();
    await Promise.all([
      this.page.waitForURL('**/projects'),
      this.projectsLink.click(),
    ]);
  }

  async goToContact() {
    await this.openMenu();
    await Promise.all([
      this.page.waitForURL('**/contact'),
      this.contactLink.click(),
    ]);
  }

  async goToMasterControl() {
    await this.openMenu();
    await Promise.all([
      this.page.waitForURL('**/admin'),
      this.masterControlLink.click(),
    ]);
  }

  async goToHome() {
    await Promise.all([
      this.page.waitForURL('/'),
      this.homeLink.click(),
    ]);
  }

  async clickSignIn() {
    await this.signInButton.click();
  }

  async clickLogout() {
    await this.logoutButton.click();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.logoutButton.isVisible();
  }
}
