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
  readonly saveDraftButton: Locator;
  readonly publishButton: Locator;
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
    this.saveDraftButton = page.getByTestId('editor-save-draft');
    this.publishButton = page.getByTestId('editor-publish-button');
    this.cancelButton = page.getByTestId('editor-cancel-button');
    this.newButton = page.getByTestId('editor-new-button');
    this.deleteButton = page.getByTestId('editor-delete-button');
  }

  /**
   * Navigate to the editor page for a specific section.
   */
  async goto(sectionId: string) {
    await super.goto(`/editor?section_id=${sectionId}`);
  }

  /**
   * Navigate to edit an existing story within a section.
   */
  async gotoEdit(storyId: string, sectionId: string) {
    await super.goto(`/editor?id=${storyId}&section_id=${sectionId}`);
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
   * Click save as draft button.
   */
  async saveDraft() {
    await this.saveDraftButton.click();
  }

  /**
   * Click publish button.
   */
  async publish() {
    await this.publishButton.click();
  }

  /**
   * Click save button (defaults to save draft).
   */
  async save() {
    await this.saveDraftButton.click();
  }

  /**
   * Click cancel button and wait for navigation.
   */
  async cancel() {
    await this.cancelButton.click();
    await this.page.waitForURL(/^(?!.*\/editor)/, { timeout: 10000 });
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
   * Waits briefly for the button to appear before checking.
   */
  async isEditMode(): Promise<boolean> {
    try {
      await this.newButton.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if save draft button is disabled.
   */
  async isSaveDisabled(): Promise<boolean> {
    return this.saveDraftButton.isDisabled();
  }

  /**
   * Get save draft button text.
   */
  async getSaveButtonText(): Promise<string> {
    const text = await this.saveDraftButton.textContent();
    return text || '';
  }

  /**
   * Get publish button text.
   */
  async getPublishButtonText(): Promise<string> {
    const text = await this.publishButton.textContent();
    return text || '';
  }

  /**
   * Fill complete story form.
   */
  async fillStory(options: { title: string; content: string; publish?: boolean }) {
    await this.setTitle(options.title);
    await this.richTextEditor.setContent(options.content);
  }

  /**
   * Create and save a new story (as draft or published).
   */
  async createStory(options: { title: string; content: string; publish?: boolean }) {
    await this.fillStory(options);
    if (options.publish) {
      await this.publish();
    } else {
      await this.saveDraft();
    }
  }
}
