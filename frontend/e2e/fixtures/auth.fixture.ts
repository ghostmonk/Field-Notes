import { test as base, Page } from '@playwright/test';

/**
 * Mock session data for authenticated tests.
 */
export interface MockSession {
  user: {
    name: string;
    email: string;
    image?: string;
  };
  expires: string;
  accessToken: string;
}

/**
 * Default mock session for authenticated user.
 */
export const defaultMockSession: MockSession = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  accessToken: 'mock-access-token-for-testing',
};

/**
 * Sets up session mocking for NextAuth by intercepting the session API endpoint.
 */
async function mockNextAuthSession(page: Page, session: MockSession | null) {
  await page.route('**/api/auth/session', async (route) => {
    if (session) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }
  });

  // Also mock the CSRF token endpoint
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf-token' }),
    });
  });

  // Mock providers endpoint
  await page.route('**/api/auth/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        google: {
          id: 'google',
          name: 'Google',
          type: 'oauth',
          signinUrl: '/api/auth/signin/google',
          callbackUrl: '/api/auth/callback/google',
        },
      }),
    });
  });
}

/**
 * Extended test fixture with authentication helpers.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  unauthenticatedPage: Page;
}>({
  /**
   * Page with authenticated session.
   */
  authenticatedPage: async ({ page }, use) => {
    await mockNextAuthSession(page, defaultMockSession);
    await use(page);
  },

  /**
   * Page without authentication (logged out).
   */
  unauthenticatedPage: async ({ page }, use) => {
    await mockNextAuthSession(page, null);
    await use(page);
  },
});

export { expect } from '@playwright/test';
