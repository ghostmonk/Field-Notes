import { test as base, Page } from '@playwright/test';
import { test as authTest, MockSession, defaultMockSession } from './auth.fixture';
import {
  sampleStories as sharedStories,
  samplePages as sharedPages,
  sampleProjects as sharedProjects,
  sampleSections as sharedSections,
  sampleReactions as sharedReactions,
  sampleComments as sharedComments,
  FIXED_TIMESTAMP,
  TestStory,
  TestPage,
  TestProject,
  TestSection,
  TestReactionCounts,
  TestComment,
  projectToCard,
  createTestComment,
} from '../test-data';

/**
 * API Mock Fixture
 *
 * This uses Playwright's page.route() to intercept CLIENT-SIDE API requests.
 * For SSR (Server-Side Rendering) requests made by Next.js getServerSideProps/getStaticProps,
 * these routes won't be intercepted because they happen on the server.
 *
 * For SSR testing, we use a separate Express mock server (e2e/mock-server.ts) that
 * Next.js connects to via the BACKEND_URL environment variable.
 *
 * Both approaches are needed:
 * - page.route(): Client-side requests, can be customized per-test
 * - mock-server.ts: SSR requests, provides baseline data for all tests
 *
 * Test data is shared via e2e/test-data.ts to ensure consistency.
 */

/**
 * Story type matching the frontend API types.
 */
export type MockStory = TestStory;

/**
 * Paginated response matching the backend API.
 */
export interface MockPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Creates a mock story with default values.
 * Uses fixed timestamp from shared test-data for consistency.
 * ID generation uses timestamp + random suffix to avoid collisions in parallel tests.
 */
export function createMockStory(overrides: Partial<MockStory> = {}): MockStory {
  const id = overrides.id || `story-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    title: 'Test Story Title',
    content: '<p>This is test story content with some <strong>bold</strong> text.</p>',
    slug: 'test-story-title',
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
    ...overrides,
  };
}

/**
 * Creates a paginated response with mock stories.
 */
export function createMockStoriesResponse(
  stories: MockStory[],
  options: { page?: number; size?: number; total?: number } = {}
): MockPaginatedResponse<MockStory> {
  const page = options.page ?? 1;
  const size = options.size ?? 10;
  const total = options.total ?? stories.length;
  const pages = Math.ceil(total / size);

  return {
    items: stories,
    total,
    page,
    size,
    pages,
  };
}

/**
 * Sample stories for testing various scenarios.
 * Data is imported from shared test-data.ts for consistency with mock server.
 */
export const sampleStories = {
  published: sharedStories[0], // story-1: My Published Story
  draft: sharedStories[1],     // story-2: My Draft Story
  withImages: sharedStories[2], // story-3: Story With Images
};

/**
 * API mock configuration options.
 */
export interface ApiMockOptions {
  stories?: MockStory[];
  pages?: TestPage[];
  projects?: TestProject[];
  sections?: TestSection[];
  reactions?: TestReactionCounts;
  comments?: TestComment[];
  failRequests?: boolean;
  networkDelay?: number;
}

/**
 * Sets up API mocking for the backend endpoints.
 */
async function setupApiMocks(page: Page, options: ApiMockOptions = {}) {
  const {
    stories = [sampleStories.published, sampleStories.draft],
    pages = sharedPages,
    projects = sharedProjects,
    sections = sharedSections,
    reactions = sharedReactions,
    comments = sharedComments,
    failRequests = false,
    networkDelay = 0,
  } = options;

  // Helper to add delay if configured
  const maybeDelay = async () => {
    if (networkDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, networkDelay));
    }
  };

  // Mock stories list endpoint
  await page.route('**/stories?**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const page_num = parseInt(url.searchParams.get('page') || '1', 10);
    const size = parseInt(url.searchParams.get('size') || '10', 10);

    // Paginate stories
    const start = (page_num - 1) * size;
    const pageStories = stories.slice(start, start + size);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createMockStoriesResponse(pageStories, {
        page: page_num,
        size,
        total: stories.length,
      })),
    });
  });

  // Mock individual story by slug
  await page.route('**/stories/slug/**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];
    const story = stories.find((s) => s.slug === slug);

    if (story) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Story not found' }),
      });
    }
  });

  // Mock individual story by ID (matches story-1, UUIDs, etc.)
  // Negative lookahead ensures we don't match /stories/slug/... paths
  // Case-insensitive flag handles uppercase UUIDs
  await page.route(/\/stories\/(?!slug\/)[\w-]+$/i, async (route) => {
    await maybeDelay();
    const method = route.request().method();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (method === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...body, id }),
      });
      return;
    }

    const story = stories.find((s) => s.id === id);
    if (story) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Story not found' }),
      });
    }
  });

  // Mock create story endpoint
  await page.route('**/stories', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const body = route.request().postDataJSON();
    const newStory = createMockStory({
      ...body,
      id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    });

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(newStory),
    });
  });

  // Mock upload endpoints
  await page.route('**/upload/**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Upload failed' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/mock-uploaded-file.jpg' }),
    });
  });

  // Mock pages endpoint (About, Contact)
  // Note: Pattern must include /api/ to avoid matching Next.js bundle paths like /_next/static/chunks/pages/
  await page.route('**/api/pages/**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const pageType = pathParts[pathParts.length - 1];

    const pageData = pages.find((p) => p.page_type === pageType);

    if (pageData) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageData),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: `Page '${pageType}' not found` }),
      });
    }
  });

  // Mock projects list endpoint with query params (API route only)
  await page.route(/\/api\/projects\?/, async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const featuredOnly = url.searchParams.get('featured_only') === 'true';

    let filteredProjects = projects.filter((p) => p.is_published);
    if (featuredOnly) {
      filteredProjects = filteredProjects.filter((p) => p.is_featured);
    }

    const pageProjects = filteredProjects.slice(offset, offset + limit);
    const projectCards = pageProjects.map(projectToCard);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: projectCards,
        total: filteredProjects.length,
        limit,
        offset,
      }),
    });
  });

  // Mock projects list endpoint without query params (API route only)
  await page.route(/\/api\/projects\/?$/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fallback();
      return;
    }

    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const filteredProjects = projects.filter((p) => p.is_published);
    const projectCards = filteredProjects.map(projectToCard);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: projectCards,
        total: filteredProjects.length,
        limit: 20,
        offset: 0,
      }),
    });
  });

  // Mock project by slug endpoint
  await page.route('**/projects/slug/**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];
    const project = projects.find((p) => p.slug === slug && p.is_published);

    if (project) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(project),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Project not found' }),
      });
    }
  });

  // Mock project by ID endpoint (for API routes that use slug as path param)
  // Note: Must NOT match page routes like /projects/awesome-portfolio-site
  // Only match /api/projects/{slug} patterns
  await page.route(/\/api\/projects\/[\w-]+$/i, async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const slugOrId = pathParts[pathParts.length - 1];

    // Try to find by slug first (for frontend API routes), then by ID
    const project = projects.find(
      (p) => (p.slug === slugOrId || p.id === slugOrId) && p.is_published
    );

    if (project) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(project),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Project not found' }),
      });
    }
  });

  // Mock warmup endpoint (called by keep-alive service on page load)
  await page.route('**/api/warmup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'warm', message: 'Mock warmup successful' }),
    });
  });

  // Mock health endpoint (called by keep-alive service periodically)
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  // Mock engagement reactions endpoint (GET and POST)
  await page.route('**/api/engagement/*/*/reactions', async (route) => {
    await maybeDelay();
    const method = route.request().method();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reactions),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          added: true,
          reaction_tag: body.reaction_tag,
        }),
      });
    }
  });

  // Mock engagement comments endpoint (GET and POST)
  await page.route('**/api/engagement/*/*/comments', async (route) => {
    await maybeDelay();
    const method = route.request().method();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ comments }),
      });
    } else if (method === 'POST') {
      const body = route.request().postDataJSON();
      const newComment = createTestComment({
        content: body.content,
        parent_id: body.parent_id,
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newComment),
      });
    }
  });

  // Mock delete comment endpoint
  await page.route('**/api/engagement/comments/*', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    }
  });

  // Mock sections navigation endpoint (used by useNavSections hook)
  await page.route('**/api/sections/navigation', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const navSections = sections.filter((s) => s.nav_visibility === 'main' && s.is_published);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: navSections,
        total: navSections.length,
        limit: 20,
        offset: 0,
      }),
    });
  });

  // Mock sections by-slug endpoint
  await page.route('**/api/sections/by-slug/**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];
    const section = sections.find((s) => s.slug === slug && s.is_published);

    if (section) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(section),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Section not found' }),
      });
    }
  });

  // Mock bulk counts endpoint
  await page.route('**/api/engagement/bulk/counts', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    const body = route.request().postDataJSON();
    const counts: Record<string, { reactions: Record<string, number>; comment_count: number }> = {};

    for (const target of body.targets) {
      const key = `${target.type}:${target.id}`;
      counts[key] = {
        reactions: reactions.counts,
        comment_count: comments.length,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ counts }),
    });
  });
}

/**
 * Extended test fixture with API mocking.
 */
export const test = authTest.extend<{
  mockApiPage: Page;
  mockAuthenticatedApiPage: Page;
}>({
  /**
   * Page with mocked API (unauthenticated).
   */
  mockApiPage: async ({ unauthenticatedPage }, use) => {
    await setupApiMocks(unauthenticatedPage);
    await use(unauthenticatedPage);
  },

  /**
   * Page with mocked API (authenticated).
   */
  mockAuthenticatedApiPage: async ({ authenticatedPage }, use) => {
    await setupApiMocks(authenticatedPage);
    await use(authenticatedPage);
  },
});

export { expect } from '@playwright/test';
export { setupApiMocks, defaultMockSession };
export type { MockSession };
