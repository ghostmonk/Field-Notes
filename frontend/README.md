# Turbulence Frontend

A Next.js-based frontend for the Turbulence blog/CMS system.

## Architecture

The frontend is structured with a clean, maintainable architecture:

### Core Components

- **API Client Layer** (`src/lib/api-client.ts`): Central module for API communication with consistent error handling
- **Authentication Utilities** (`src/lib/auth.ts`): Token handling and auth-related helper functions
- **Custom Hooks** (`src/hooks/`): React hooks for data fetching and state management
- **API Routes** (`src/pages/api/`): Next.js API routes that proxy requests to the backend
- **Components** (`src/components/`): Reusable UI components

### Data Flow

1. **UI Components**: Use custom hooks to fetch and manipulate data
2. **Custom Hooks**: Manage state and connect to API client
3. **API Client**: Makes requests to Next.js API routes
4. **API Routes**: Proxy requests to the backend with authentication

### Authentication

The app uses NextAuth.js for authentication with Google OAuth. The authentication flow:
1. User signs in via Google
2. NextAuth handles token management
3. Tokens are passed to the backend API when needed

## Development

To run the development server:

```bash
npm run dev
# or with Docker
npm run dev:docker
```

## Building

```bash
npm run build
npm start
```

## E2E Testing

The frontend uses [Playwright](https://playwright.dev/) for end-to-end testing with a Page Object Model architecture.

### Running Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed browser (visible)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

### Test Structure

```
e2e/
├── fixtures/           # Test fixtures for auth and API mocking
├── page-objects/       # Page Object Model classes
│   └── components/     # Reusable component objects
└── specs/              # Test specifications
    ├── smoke/          # Basic functionality tests
    ├── stories/        # Story browsing and viewing tests
    └── editor/         # Story creation and editing tests
```

### Writing Tests

Tests use `data-testid` attributes for resilient selectors that don't break when styling changes:

```typescript
// Use page objects for clean, maintainable tests
const homePage = new HomePage(page);
await homePage.goto();
await homePage.waitForStories();

// Interact with elements via test IDs
const storyCard = homePage.getStoryCard('story-1');
await expect(storyCard.title).toBeVisible();
```

### Test Configuration

#### ⚠️ Security Notice: UNSAFE_EVAL Flag

The `dev:test` script includes `UNSAFE_EVAL=true` to allow Next.js hot module reloading during tests:

```bash
# This script is for E2E testing ONLY - never use in production!
npm run dev:test
```

**Why it's needed:**
- Next.js dev mode uses `eval()` for fast refresh/HMR
- The app's Content Security Policy (CSP) blocks `unsafe-eval` by default
- Without this flag, JavaScript won't execute in Playwright tests

**Security safeguards:**
- This flag is ONLY in the `dev:test` script, not in `dev` or `build`
- Production builds (`npm run build`) never use this flag
- The flag only affects the CSP header, not actual code execution safety
- CI/CD should only use `npm run test:e2e` which starts its own isolated server

**⛔ NEVER use `UNSAFE_EVAL=true` in production environments.**

### Mocking Strategy

Tests use two complementary mocking approaches:
- **Playwright route mocking** (`e2e/fixtures/`): Intercepts client-side API requests, customizable per-test
- **Express mock server** (`e2e/mock-server.ts`): Handles SSR requests from `getServerSideProps`

### First Time Setup

Before running tests for the first time, install Playwright browsers:

```bash
npx playwright install
```

## Docker

The application can be run with Docker using:

```bash
docker build -t turbulence-frontend .
docker run -p 3000:3000 turbulence-frontend
``` 