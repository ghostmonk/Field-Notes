import { test, expect } from '../../fixtures';
import { EditorPage } from '../../page-objects/editor.page';

test.describe('Create Story', () => {
  test('editor page loads for authenticated user', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    // Verify editor elements are visible
    await expect(editorPage.editorPage).toBeVisible();
    await expect(editorPage.titleInput).toBeVisible();
    await expect(editorPage.richTextEditor.editor).toBeVisible();
    await expect(editorPage.publishToggle).toBeVisible();
    await expect(editorPage.saveButton).toBeVisible();
    await expect(editorPage.cancelButton).toBeVisible();
  });

  test('title input accepts text', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    await editorPage.setTitle('My Test Story');

    const title = await editorPage.getTitle();
    expect(title).toBe('My Test Story');
  });

  test('rich text editor accepts content', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    await editorPage.richTextEditor.type('This is my story content');

    const html = await editorPage.richTextEditor.getHTML();
    expect(html).toContain('This is my story content');
  });

  test('publish toggle can be toggled', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    // Default state
    const initialState = await editorPage.isPublished();

    // Toggle
    await editorPage.setPublished(!initialState);
    const newState = await editorPage.isPublished();

    expect(newState).toBe(!initialState);
  });

  test('save button reflects publish state', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    // With publish unchecked
    await editorPage.setPublished(false);
    let buttonText = await editorPage.getSaveButtonText();
    expect(buttonText).toContain('Draft');

    // With publish checked
    await editorPage.setPublished(true);
    buttonText = await editorPage.getSaveButtonText();
    expect(buttonText).toContain('Publish');
  });

  test('cancel button navigates to home', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    await editorPage.cancel();

    // Should be on home page
    expect(editorPage.url).toBe('http://localhost:3000/');
  });

  test('toolbar buttons are visible', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto();
    await editorPage.waitForEditor();

    // Verify all toolbar buttons are visible
    await expect(editorPage.richTextEditor.boldButton).toBeVisible();
    await expect(editorPage.richTextEditor.italicButton).toBeVisible();
    await expect(editorPage.richTextEditor.h1Button).toBeVisible();
    await expect(editorPage.richTextEditor.h2Button).toBeVisible();
    await expect(editorPage.richTextEditor.bulletListButton).toBeVisible();
    await expect(editorPage.richTextEditor.orderedListButton).toBeVisible();
    await expect(editorPage.richTextEditor.blockquoteButton).toBeVisible();
    await expect(editorPage.richTextEditor.imageButton).toBeVisible();
    await expect(editorPage.richTextEditor.videoButton).toBeVisible();
  });

  test('navigation from home to editor works', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    // Start from home
    await mockAuthenticatedApiPage.goto('/');

    // Click new story link
    await editorPage.nav.goToNewStory();

    // Should be on editor page
    expect(editorPage.url).toContain('/editor');
  });
});
