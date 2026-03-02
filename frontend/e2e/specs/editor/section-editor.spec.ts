import { test, expect } from '../../fixtures/api-mock.fixture';
import { TEST_SECTION_IDS } from '../../test-data';

test.describe('Section-Aware Editor', () => {
  test('shows section picker when no section_id is provided', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto('/editor');
    await mockAuthenticatedApiPage.getByTestId('section-picker').waitFor({ state: 'visible' });

    // Should show editable sections (story, project, page types)
    await expect(mockAuthenticatedApiPage.getByTestId('section-picker-blog')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('section-picker-about')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('section-picker-projects')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('section-picker-contact')).toBeVisible();
  });

  test('clicking section picker navigates to editor with section_id', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto('/editor');
    await mockAuthenticatedApiPage.getByTestId('section-picker').waitFor({ state: 'visible' });

    await mockAuthenticatedApiPage.getByTestId('section-picker-blog').click();
    await mockAuthenticatedApiPage.waitForURL(`**/editor?section_id=${TEST_SECTION_IDS.BLOG}`, { timeout: 10000 });
  });

  test('renders story editor form for story content_type', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto(`/editor?section_id=${TEST_SECTION_IDS.BLOG}`);
    await mockAuthenticatedApiPage.getByTestId('editor-page').waitFor({ state: 'visible' });

    // Story form has title input, rich text editor, publish toggle
    await expect(mockAuthenticatedApiPage.getByTestId('editor-title-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-publish-toggle')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-save-button')).toBeVisible();

    // Story form should show "New Story" in heading
    await expect(mockAuthenticatedApiPage.getByText('New Story')).toBeVisible();
  });

  test('renders project editor form for project content_type', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto(`/editor?section_id=${TEST_SECTION_IDS.PROJECTS}`);
    await mockAuthenticatedApiPage.getByTestId('editor-page').waitFor({ state: 'visible' });

    // Project form has project-specific fields
    await expect(mockAuthenticatedApiPage.getByTestId('editor-title-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-summary-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-technologies-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-github-url-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-live-url-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-featured-toggle')).toBeVisible();

    // Project form should show "New Project" in heading
    await expect(mockAuthenticatedApiPage.getByText('New Project')).toBeVisible();
  });

  test('renders page editor form for page content_type', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto(`/editor?section_id=${TEST_SECTION_IDS.ABOUT}`);
    await mockAuthenticatedApiPage.getByTestId('editor-page').waitFor({ state: 'visible' });

    // Page form has title and content
    await expect(mockAuthenticatedApiPage.getByTestId('editor-title-input')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-publish-toggle')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-save-button')).toBeVisible();

    // Page form should not have project-specific fields
    await expect(mockAuthenticatedApiPage.getByTestId('editor-summary-input')).not.toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('editor-technologies-input')).not.toBeVisible();
  });

  test('story form includes section_id in save payload', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto(`/editor?section_id=${TEST_SECTION_IDS.BLOG}`);
    await mockAuthenticatedApiPage.getByTestId('editor-page').waitFor({ state: 'visible' });

    await mockAuthenticatedApiPage.getByTestId('editor-title-input').fill('Test Story With Section');

    // Wait for rich text editor to load, then type content
    const editor = mockAuthenticatedApiPage.locator('.tiptap.ProseMirror');
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    await editor.click();
    await mockAuthenticatedApiPage.keyboard.type('Test content');

    const createPromise = mockAuthenticatedApiPage.waitForRequest(
      (req) => req.url().includes('/api/stories') && req.method() === 'POST'
    );

    await mockAuthenticatedApiPage.getByTestId('editor-save-button').click();
    const createRequest = await createPromise;
    const body = createRequest.postDataJSON();
    expect(body.section_id).toBe(TEST_SECTION_IDS.BLOG);
    expect(body.title).toBe('Test Story With Section');
  });

  test('redirects unauthenticated users to home', async ({ mockApiPage }) => {
    await mockApiPage.goto('/editor');
    await mockApiPage.waitForURL('/', { timeout: 10000 });
  });
});
