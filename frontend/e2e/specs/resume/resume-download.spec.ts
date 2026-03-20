import { test, expect } from '../../fixtures';
import path from 'path';
import fs from 'fs';

test.describe('Resume Downloads', () => {
  test('should download PDF from resume page', async ({ mockApiPage: page }) => {
    await page.goto('/resume');

    // Wait for the page to render with resume data
    await expect(page.locator('h1')).toContainText('Test User');

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click PDF download button
    await page.getByRole('button', { name: /PDF/i }).click();

    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toContain('Resume.pdf');

    // Save and verify file is not empty
    const filePath = path.join('/tmp', download.suggestedFilename());
    await download.saveAs(filePath);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(0);

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should download DOCX from resume page', async ({ mockApiPage: page }) => {
    await page.goto('/resume');

    await expect(page.locator('h1')).toContainText('Test User');

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: /DOCX/i }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('Resume.docx');

    const filePath = path.join('/tmp', download.suggestedFilename());
    await download.saveAs(filePath);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(0);

    fs.unlinkSync(filePath);
  });
});
