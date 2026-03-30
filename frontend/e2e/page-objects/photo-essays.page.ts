import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Photo Essays page object for the gallery landing and detail views.
 */
export class PhotoEssaysPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/photo-essays');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForEssays() {
    await this.page.waitForSelector('[data-testid="photo-essay-card"]');
  }

  async getEssayCount() {
    return this.page.locator('[data-testid="photo-essay-card"]').count();
  }

  async clickEssay(index = 0) {
    await this.page.locator('[data-testid="photo-essay-card"]').nth(index).click();
  }

  async waitForMasonryGrid() {
    await this.page.waitForSelector('[data-testid="masonry-grid"]');
  }

  async getPhotoCount() {
    return this.page.locator('[data-testid="masonry-grid"] .masonry-grid__item').count();
  }

  async clickPhoto(index = 0) {
    await this.page.locator('[data-testid="masonry-grid"] .masonry-grid__item').nth(index).click();
  }

  async waitForViewer() {
    await this.page.waitForSelector('[data-testid="photo-viewer"]');
  }

  async isViewerVisible() {
    return this.page.locator('[data-testid="photo-viewer"]').isVisible();
  }

  async pressArrowRight() {
    await this.page.keyboard.press('ArrowRight');
  }

  async pressArrowLeft() {
    await this.page.keyboard.press('ArrowLeft');
  }

  async waitForCounter(expected: string) {
    await this.page.locator('.photo-viewer__counter', { hasText: expected }).waitFor({ timeout: 5000 });
  }

  async pressEscape() {
    await this.page.keyboard.press('Escape');
  }

  async getViewerCounter() {
    return this.page.locator('.photo-viewer__counter').textContent();
  }
}
