import { test, expect } from '../../fixtures/api-mock.fixture';
import { AdminSectionsPage } from '../../page-objects/admin-sections.page';
import { TEST_SECTION_IDS } from '../../test-data';

test.describe('Admin Sections Page', () => {
  test('loads for admin users and shows all sections', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    // All 4 sections should be visible
    await expect(page.sectionRow(TEST_SECTION_IDS.BLOG)).toBeVisible();
    await expect(page.sectionRow(TEST_SECTION_IDS.ABOUT)).toBeVisible();
    await expect(page.sectionRow(TEST_SECTION_IDS.PROJECTS)).toBeVisible();
    await expect(page.sectionRow(TEST_SECTION_IDS.CONTACT)).toBeVisible();
  });

  test('redirects non-admin users', async ({ mockApiPage }) => {
    await mockApiPage.goto('/admin/sections');
    // Should redirect to home since unauthenticated
    await mockApiPage.waitForURL('/', { timeout: 10000 });
  });

  test('shows create form when New Section button is clicked', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await expect(page.createForm).not.toBeVisible();
    await page.openCreateForm();
    await expect(page.createForm).toBeVisible();
    await expect(page.titleInput).toBeVisible();
    await expect(page.displayTypeSelect).toBeVisible();
    await expect(page.contentTypeSelect).toBeVisible();
    await expect(page.navVisibilitySelect).toBeVisible();
  });

  test('creates a section', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await page.openCreateForm();
    await page.fillCreateForm({
      title: 'Gallery',
      displayType: 'gallery',
      contentType: 'image',
      navVisibility: 'main',
    });

    // Intercept the POST to verify it fires
    const createPromise = mockAuthenticatedApiPage.waitForRequest(
      (req) => req.url().includes('/api/sections') && req.method() === 'POST'
    );

    await page.submitCreateForm();
    const createRequest = await createPromise;
    const body = createRequest.postDataJSON();
    expect(body.title).toBe('Gallery');
    expect(body.display_type).toBe('gallery');
    expect(body.content_type).toBe('image');
  });

  test('opens edit form for a section', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await page.editButton(TEST_SECTION_IDS.BLOG).click();
    await expect(page.editForm(TEST_SECTION_IDS.BLOG)).toBeVisible();
    await expect(page.editTitleInput(TEST_SECTION_IDS.BLOG)).toHaveValue('Blog');
  });

  test('cancels edit form', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await page.editButton(TEST_SECTION_IDS.BLOG).click();
    await expect(page.editForm(TEST_SECTION_IDS.BLOG)).toBeVisible();

    await page.editCancelButton(TEST_SECTION_IDS.BLOG).click();
    await expect(page.editForm(TEST_SECTION_IDS.BLOG)).not.toBeVisible();
    await expect(page.sectionRow(TEST_SECTION_IDS.BLOG)).toBeVisible();
  });

  test('saves section edits', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await page.editButton(TEST_SECTION_IDS.BLOG).click();
    await page.editTitleInput(TEST_SECTION_IDS.BLOG).fill('Updated Blog');

    const updatePromise = mockAuthenticatedApiPage.waitForRequest(
      (req) => req.url().includes(`/api/sections/${TEST_SECTION_IDS.BLOG}`) && req.method() === 'PUT'
    );

    await page.editSubmitButton(TEST_SECTION_IDS.BLOG).click();
    const updateRequest = await updatePromise;
    const body = updateRequest.postDataJSON();
    expect(body.title).toBe('Updated Blog');
  });

  test('deletes a section after confirmation', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    const deletePromise = mockAuthenticatedApiPage.waitForRequest(
      (req) => req.url().includes(`/api/sections/${TEST_SECTION_IDS.CONTACT}`) && req.method() === 'DELETE'
    );

    await page.deleteButton(TEST_SECTION_IDS.CONTACT).click();

    // Confirm via the custom ConfirmDialog component
    await mockAuthenticatedApiPage.getByTestId('confirm-ok').click();
    await deletePromise;
  });

  test('Add Content navigates to editor with section_id', async ({ mockAuthenticatedApiPage }) => {
    const page = new AdminSectionsPage(mockAuthenticatedApiPage);
    await page.goto();
    await page.waitForPage();

    await page.addContentButton(TEST_SECTION_IDS.BLOG).click();
    await mockAuthenticatedApiPage.waitForURL(`**/editor?section_id=${TEST_SECTION_IDS.BLOG}`, { timeout: 10000 });
  });
});
