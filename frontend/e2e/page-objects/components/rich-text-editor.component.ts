import { Page, Locator } from '@playwright/test';

/**
 * Rich text editor component page object.
 * Encapsulates interactions with the TipTap editor.
 */
export class RichTextEditorComponent {
  readonly page: Page;

  // Container
  readonly editor: Locator;
  readonly content: Locator;
  readonly proseMirror: Locator;

  // Toolbar buttons
  readonly boldButton: Locator;
  readonly italicButton: Locator;
  readonly h1Button: Locator;
  readonly h2Button: Locator;
  readonly bulletListButton: Locator;
  readonly orderedListButton: Locator;
  readonly blockquoteButton: Locator;
  readonly imageButton: Locator;
  readonly videoButton: Locator;

  // File inputs
  readonly imageInput: Locator;
  readonly videoInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Container
    this.editor = page.getByTestId('rich-text-editor');
    this.content = page.getByTestId('editor-content');
    this.proseMirror = page.locator('.ProseMirror');

    // Toolbar
    this.boldButton = page.getByTestId('toolbar-bold');
    this.italicButton = page.getByTestId('toolbar-italic');
    this.h1Button = page.getByTestId('toolbar-h1');
    this.h2Button = page.getByTestId('toolbar-h2');
    this.bulletListButton = page.getByTestId('toolbar-bullet-list');
    this.orderedListButton = page.getByTestId('toolbar-ordered-list');
    this.blockquoteButton = page.getByTestId('toolbar-blockquote');
    this.imageButton = page.getByTestId('toolbar-image');
    this.videoButton = page.getByTestId('toolbar-video');

    // File inputs
    this.imageInput = page.getByTestId('image-upload-input');
    this.videoInput = page.getByTestId('video-upload-input');
  }

  /**
   * Focus the editor content area.
   */
  async focus() {
    await this.proseMirror.click();
  }

  /**
   * Type text into the editor.
   */
  async type(text: string) {
    await this.focus();
    await this.page.keyboard.type(text, { delay: 50 });
  }

  /**
   * Clear editor content and type new text.
   */
  async setContent(text: string) {
    await this.focus();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(text, { delay: 50 });
  }

  /**
   * Apply bold formatting to selected text.
   */
  async toggleBold() {
    await this.boldButton.click();
  }

  /**
   * Apply italic formatting to selected text.
   */
  async toggleItalic() {
    await this.italicButton.click();
  }

  /**
   * Apply H1 heading to current block.
   */
  async toggleH1() {
    await this.h1Button.click();
  }

  /**
   * Apply H2 heading to current block.
   */
  async toggleH2() {
    await this.h2Button.click();
  }

  /**
   * Toggle bullet list.
   */
  async toggleBulletList() {
    await this.bulletListButton.click();
  }

  /**
   * Toggle ordered list.
   */
  async toggleOrderedList() {
    await this.orderedListButton.click();
  }

  /**
   * Toggle blockquote.
   */
  async toggleBlockquote() {
    await this.blockquoteButton.click();
  }

  /**
   * Upload an image file.
   */
  async uploadImage(filePath: string) {
    await this.imageInput.setInputFiles(filePath);
  }

  /**
   * Upload a video file.
   */
  async uploadVideo(filePath: string) {
    await this.videoInput.setInputFiles(filePath);
  }

  /**
   * Get the HTML content of the editor.
   */
  async getHTML(): Promise<string> {
    return this.proseMirror.innerHTML();
  }

  /**
   * Check if editor is visible.
   */
  async isVisible(): Promise<boolean> {
    return this.editor.isVisible();
  }
}
