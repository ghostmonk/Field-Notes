import { test, expect } from '../../fixtures';
import { PhotoEssaysPage } from '../../page-objects/photo-essays.page';

test.describe('Photo Essays Gallery', () => {
  let photoEssaysPage: PhotoEssaysPage;

  test.beforeEach(async ({ mockApiPage }) => {
    photoEssaysPage = new PhotoEssaysPage(mockApiPage);
  });

  test('displays essay cards on gallery landing page', async () => {
    await photoEssaysPage.goto();
    await photoEssaysPage.waitForEssays();
    const count = await photoEssaysPage.getEssayCount();
    expect(count).toBe(2);
  });

  test('navigates to essay detail with masonry grid', async () => {
    await photoEssaysPage.goto();
    await photoEssaysPage.waitForEssays();
    await photoEssaysPage.clickEssay(0);
    await photoEssaysPage.waitForMasonryGrid();
    const photoCount = await photoEssaysPage.getPhotoCount();
    expect(photoCount).toBe(3);
  });

  test('opens photo viewer on photo click', async () => {
    await photoEssaysPage.goto();
    await photoEssaysPage.waitForEssays();
    await photoEssaysPage.clickEssay(0);
    await photoEssaysPage.waitForMasonryGrid();
    await photoEssaysPage.clickPhoto(0);
    await photoEssaysPage.waitForViewer();
    const visible = await photoEssaysPage.isViewerVisible();
    expect(visible).toBe(true);
  });

  test('keyboard navigation works in photo viewer', async () => {
    await photoEssaysPage.goto();
    await photoEssaysPage.waitForEssays();
    await photoEssaysPage.clickEssay(0);
    await photoEssaysPage.waitForMasonryGrid();
    await photoEssaysPage.clickPhoto(0);
    await photoEssaysPage.waitForViewer();

    await photoEssaysPage.waitForCounter('1 / 3');

    await photoEssaysPage.pressArrowRight();
    await photoEssaysPage.waitForCounter('2 / 3');

    await photoEssaysPage.pressArrowLeft();
    await photoEssaysPage.waitForCounter('1 / 3');
  });

  test('escape closes photo viewer', async () => {
    await photoEssaysPage.goto();
    await photoEssaysPage.waitForEssays();
    await photoEssaysPage.clickEssay(0);
    await photoEssaysPage.waitForMasonryGrid();
    await photoEssaysPage.clickPhoto(0);
    await photoEssaysPage.waitForViewer();

    await photoEssaysPage.pressEscape();
    const visible = await photoEssaysPage.isViewerVisible();
    expect(visible).toBe(false);
  });
});
