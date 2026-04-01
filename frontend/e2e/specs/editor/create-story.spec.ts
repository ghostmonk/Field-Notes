import { test, expect, TEST_SECTION_IDS } from '../../fixtures';
import { EditorPage } from '../../page-objects/editor.page';

const BLOG_SECTION_ID = TEST_SECTION_IDS.BLOG;

test.describe('Create Story', () => {
  test('editor page loads for authenticated user', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
    await editorPage.waitForEditor();

    // Verify editor elements are visible
    await expect(editorPage.editorPage).toBeVisible();
    await expect(editorPage.titleInput).toBeVisible();
    await expect(editorPage.richTextEditor.editor).toBeVisible();
    await expect(editorPage.saveDraftButton).toBeVisible();
    await expect(editorPage.publishButton).toBeVisible();
    await expect(editorPage.cancelButton).toBeVisible();
  });

  test('title input accepts text', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
    await editorPage.waitForEditor();

    await editorPage.setTitle('My Test Story');

    const title = await editorPage.getTitle();
    expect(title).toBe('My Test Story');
  });

  test('rich text editor accepts content', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
    await editorPage.waitForEditor();

    await editorPage.richTextEditor.type('This is my story content');

    const html = await editorPage.richTextEditor.getHTML();
    expect(html).toContain('This is my story content');
  });

  test('draft and publish buttons are both visible', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
    await editorPage.waitForEditor();

    await expect(editorPage.saveDraftButton).toBeVisible();
    await expect(editorPage.publishButton).toBeVisible();

    const draftText = await editorPage.getSaveButtonText();
    expect(draftText).toContain('Draft');

    const publishText = await editorPage.getPublishButtonText();
    expect(publishText).toContain('Publish');
  });

  test('cancel button navigates to section page', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
    await editorPage.waitForEditor();

    await editorPage.cancel();

    // Should navigate to the section page
    expect(editorPage.url).toBe('http://localhost:3000/blog');
  });

  test('toolbar buttons are visible', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.goto(BLOG_SECTION_ID);
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

    // Click command center link
    await editorPage.nav.goToCommandCenter();

    // Should be on admin page
    expect(editorPage.url).toContain('/admin');
  });
});
