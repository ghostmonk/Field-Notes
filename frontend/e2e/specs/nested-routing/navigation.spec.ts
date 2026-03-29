import { test, expect } from '../../fixtures';

test.describe('Nested Routing', () => {
  test('top-level section loads', async ({ mockApiPage }) => {
    await mockApiPage.goto('/blog');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('nested section loads via path', async ({ mockApiPage }) => {
    await mockApiPage.goto('/blog/tech');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('deep nested section loads via path', async ({ mockApiPage }) => {
    await mockApiPage.goto('/creative-work/photography/portraits');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });

  test('404 for nonexistent path', async ({ mockApiPage }) => {
    const response = await mockApiPage.goto('/does/not/exist');
    expect(response?.status()).toBe(404);
  });

  test('static page section loads', async ({ mockApiPage }) => {
    await mockApiPage.goto('/about');
    await expect(mockApiPage.locator('h1')).toBeVisible();
  });
});
