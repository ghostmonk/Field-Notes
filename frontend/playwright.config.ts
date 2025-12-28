import { defineConfig, devices } from '@playwright/test';

// Timeout constants
const MOCK_SERVER_TIMEOUT = 10 * 1000; // 10 seconds for mock server to start
const NEXT_DEV_TIMEOUT = 120 * 1000; // 2 minutes for Next.js dev server to start

/**
 * Playwright configuration for E2E tests.
 * Uses data-testid selectors for resilient tests.
 */
export default defineConfig({
  testDir: './e2e/specs',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only, 1 retry locally for flaky tests */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'github' : 'html',

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Default data-testid attribute */
    testIdAttribute: 'data-testid',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to enable additional browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run mock API server and Next.js dev server before starting the tests.
   *
   * The mock server (port 5555) handles SSR requests from Next.js getServerSideProps.
   * Client-side API requests are handled by page.route() in the test fixtures.
   */
  webServer: [
    {
      command: 'npx tsx e2e/mock-server.ts',
      url: 'http://localhost:5555/health',
      reuseExistingServer: !process.env.CI,
      timeout: MOCK_SERVER_TIMEOUT,
    },
    {
      command: 'npm run dev:test',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: NEXT_DEV_TIMEOUT,
    },
  ],
});
