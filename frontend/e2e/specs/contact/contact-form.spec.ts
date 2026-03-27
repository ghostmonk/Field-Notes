import { test, expect } from '../../fixtures';

test.describe('Contact Form', () => {
  test('shows form fields for unauthenticated user', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await expect(mockApiPage.getByTestId('contact-form')).toBeVisible();
    await expect(mockApiPage.getByTestId('contact-name')).toBeVisible();
    await expect(mockApiPage.getByTestId('contact-email')).toBeVisible();
    await expect(mockApiPage.getByTestId('contact-message')).toBeVisible();
  });

  test('hides email field for authenticated user', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto('/contact');
    await expect(mockAuthenticatedApiPage.getByTestId('contact-form')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('contact-name')).toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('contact-email')).not.toBeVisible();
    await expect(mockAuthenticatedApiPage.getByTestId('contact-message')).toBeVisible();
  });

  test('submits form and shows success message', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await mockApiPage.getByTestId('contact-name').fill('Alice');
    await mockApiPage.getByTestId('contact-email').fill('alice@test.com');
    await mockApiPage.getByTestId('contact-message').fill('Hello, this is a test.');
    await mockApiPage.getByRole('button', { name: /send message/i }).click();
    await expect(mockApiPage.getByTestId('contact-success')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await mockApiPage.getByRole('button', { name: /send message/i }).click();
    await expect(mockApiPage.getByText('Name is required')).toBeVisible();
    await expect(mockApiPage.getByText('Message is required')).toBeVisible();
  });
});
