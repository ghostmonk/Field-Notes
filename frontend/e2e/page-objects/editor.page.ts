import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';
import { RichTextEditorComponent } from './components/rich-text-editor.component';

/**
 * Editor page object for creating and editing stories.
 */
export class EditorPage extends BasePage {
  readonly nav: TopNavComponent;
  readonly richTextEditor: RichTextEditorComponent;

  // Page container
  readonly editorPage: Locator;

  // Form elements
  readonly titleInput: Locator;
  readonly publishToggle: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Header buttons (visible when editing)
  readonly newButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);
    this.richTextEditor = new RichTextEditorComponent(page);

    this.editorPage = page.getByTestId('editor-page');
    this.titleInput = page.getByTestId('editor-title-input');
    this.publishToggle = page.getByTestId('editor-publish-toggle');
    this.saveButton = page.getByTestId('editor-save-button');
    this.cancelButton = page.getByTestId('editor-cancel-button');
    this.newButton = page.getByTestId('editor-new-button');
    this.deleteButton = page.getByTestId('editor-delete-button');
  }

  /**
   * Navigate to the editor page (new story).
   */
  async goto() {
    await super.goto('/editor');
  }

  /**
   * Navigate to edit an existing story.
   */
  async gotoEdit(storyId: string) {
    await super.goto(`/editor?id=${storyId}`);
  }

  /**
   * Wait for editor to be ready.
   */
  async waitForEditor() {
    await this.editorPage.waitFor({ state: 'visible' });
    await this.richTextEditor.editor.waitFor({ state: 'visible' });
  }

  /**
   * Fill in the story title.
   */
  async setTitle(title: string) {
    await this.titleInput.fill(title);
  }

  /**
   * Get the current title value.
   */
  async getTitle(): Promise<string> {
    return this.titleInput.inputValue();
  }

  /**
   * Set the publish state.
   */
  async setPublished(published: boolean) {
    const isChecked = await this.publishToggle.isChecked();
    if (isChecked !== published) {
      await this.publishToggle.click();
    }
  }

  /**
   * Check if publish toggle is checked.
   */
  async isPublished(): Promise<boolean> {
    return this.publishToggle.isChecked();
  }

  /**
   * Click save button.
   */
  async save() {
    await this.saveButton.click();
  }

  /**
   * Click cancel button and wait for navigation.
   */
  async cancel() {
    await Promise.all([
      this.page.waitForURL('**/'),
      this.cancelButton.click(),
    ]);
  }

  /**
   * Click new story button (when editing).
   */
  async clickNew() {
    await this.newButton.click();
  }

  /**
   * Click delete button (when editing).
   */
  async clickDelete() {
    await this.deleteButton.click();
  }

  /**
   * Check if in edit mode (new/delete buttons visible).
   */
  async isEditMode(): Promise<boolean> {
    return this.newButton.isVisible();
  }

  /**
   * Check if save button is disabled.
   */
  async isSaveDisabled(): Promise<boolean> {
    return this.saveButton.isDisabled();
  }

  /**
   * Get save button text.
   */
  async getSaveButtonText(): Promise<string> {
    const text = await this.saveButton.textContent();
    return text || '';
  }

  /**
   * Fill complete story form.
   */
  async fillStory(options: { title: string; content: string; publish?: boolean }) {
    await this.setTitle(options.title);
    await this.richTextEditor.setContent(options.content);
    if (options.publish !== undefined) {
      await this.setPublished(options.publish);
    }
  }

  /**
   * Create and save a new story.
   */
  async createStory(options: { title: string; content: string; publish?: boolean }) {
    await this.fillStory(options);
    await this.save();
  }
}
