import { test, expect, TEST_STORY_IDS } from '../../fixtures';
import { EditorPage } from '../../page-objects/editor.page';
import { HomePage } from '../../page-objects/home.page';

test.describe('Edit Story', () => {
  test('loads existing story in edit mode', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.gotoEdit(TEST_STORY_IDS.PUBLISHED);
    await editorPage.waitForEditor();

    // Verify in edit mode
    const isEditMode = await editorPage.isEditMode();
    expect(isEditMode).toBe(true);

    // Verify edit buttons are visible
    await expect(editorPage.newButton).toBeVisible();
    await expect(editorPage.deleteButton).toBeVisible();
  });

  test('displays story title in edit mode', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.gotoEdit(TEST_STORY_IDS.PUBLISHED);
    await editorPage.waitForEditor();

    // Wait for form to populate
    await editorPage.page.waitForTimeout(500);

    // Title should be populated
    const title = await editorPage.getTitle();
    expect(title).toBe('My Published Story');
  });

  test('new button resets form', async ({ mockAuthenticatedApiPage }) => {
    const editorPage = new EditorPage(mockAuthenticatedApiPage);

    await editorPage.gotoEdit(TEST_STORY_IDS.PUBLISHED);
    await editorPage.waitForEditor();

    // Click new button
    await editorPage.clickNew();

    // URL should no longer have id param
    expect(editorPage.url).not.toContain('id=');
  });

  test('navigating from story list edit button', async ({ mockAuthenticatedApiPage }) => {
    const homePage = new HomePage(mockAuthenticatedApiPage);

    await homePage.goto();
    await homePage.waitForStories();

    // Click edit on a story
    const storyCard = homePage.getStoryCard(TEST_STORY_IDS.PUBLISHED);
    await storyCard.clickEdit();

    // Should navigate to editor with story ID
    expect(homePage.url).toContain('/editor');
    expect(homePage.url).toContain(`id=${TEST_STORY_IDS.PUBLISHED}`);
  });
});
