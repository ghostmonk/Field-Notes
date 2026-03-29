import { test as base, Page } from '@playwright/test';
import { test as authTest, MockSession, defaultMockSession } from './auth.fixture';
import {
  sampleStories as sharedStories,
  samplePages as sharedPages,
  sampleProjects as sharedProjects,
  sampleSections as sharedSections,
  allSections as sharedAllSections,
  sampleReactions as sharedReactions,
  sampleComments as sharedComments,
  samplePhotoEssayCards as sharedPhotoEssayCards,
  samplePhotoEssayDetail as sharedPhotoEssayDetail,
  sampleResume as sharedResume,
  sampleBlogChildren as sharedBlogChildren,
  FIXED_TIMESTAMP,
  TestStory,
  TestPage,
  TestProject,
  TestSection,
  TestReactionCounts,
  TestComment,
  projectToCard,
  createTestComment,
  createTestSection,
  TEST_SECTION_IDS,
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

  // Mock sections resolve-path endpoint
  await page.route('**/api/sections/resolve-path/**', async (route) => {
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
    const pathMatch = urlObj.pathname.match(/\/api\/sections\/resolve-path\/(.+)/);
    const fullPath = pathMatch ? pathMatch[1] : '';

    // Try full path as section
    const section = sharedAllSections.find((s) => s.path === fullPath && s.is_published);
    if (section) {
      const breadcrumbs: Array<{ title: string; path: string }> = [];
      let current: typeof section | undefined = section;
      while (current) {
        breadcrumbs.unshift({ title: current.title, path: current.path });
        current = current.parent_id
          ? sharedAllSections.find((s) => s.id === current!.parent_id) as typeof section | undefined
          : undefined;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'section', section, breadcrumbs }),
      });
      return;
    }

    // Try parent path as section, last segment as content slug
    const segments = fullPath.split('/');
    if (segments.length > 1) {
      const parentPath = segments.slice(0, -1).join('/');
      const itemSlug = segments[segments.length - 1];
      const parentSection = sharedAllSections.find((s) => s.path === parentPath && s.is_published);

      if (parentSection) {
        const story = stories.find((s) => s.slug === itemSlug);
        if (story) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              type: 'content',
              section: parentSection,
              content_item: { ...story, content_type: 'story' },
              breadcrumbs: [
                { title: parentSection.title, path: parentSection.path },
                { title: story.title, path: fullPath },
              ],
            }),
          });
          return;
        }

        const project = projects.find((p) => p.slug === itemSlug && p.is_published);
        if (project) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              type: 'content',
              section: parentSection,
              content_item: { ...project, content_type: 'project' },
              breadcrumbs: [
                { title: parentSection.title, path: parentSection.path },
                { title: project.title, path: fullPath },
              ],
            }),
          });
          return;
        }

        // Check photo essays
        const essay = sharedPhotoEssayCards.find((e) => e.id === itemSlug);
        if (essay && parentSection.content_type === 'photo_essay') {
          const detail = essay.id === sharedPhotoEssayDetail.id ? sharedPhotoEssayDetail : essay;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              type: 'content',
              section: parentSection,
              content_item: { ...detail, content_type: 'photo_essay' },
              breadcrumbs: [
                { title: parentSection.title, path: parentSection.path },
                { title: essay.title, path: fullPath },
              ],
            }),
          });
          return;
        }
      }
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Path not found' }),
    });
  });

  // Mock sections children endpoint
  await page.route('**/api/sections/*/children**', async (route) => {
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
    // Pattern: /api/sections/{id}/children
    const childrenIdx = pathParts.indexOf('children');
    const sectionId = childrenIdx > 0 ? pathParts[childrenIdx - 1] : '';
    const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
    const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

    if (sectionId === TEST_SECTION_IDS.BLOG) {
      const paginated = sharedBlogChildren.slice(offset, offset + limit);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: paginated, total: sharedBlogChildren.length, limit, offset }),
      });
      return;
    }

    // For other sections, return stories or projects based on content_type
    const section = sharedAllSections.find((s) => s.id === sectionId);
    if (!section) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Section not found' }),
      });
      return;
    }

    const childSections = sharedAllSections
      .filter((s) => s.parent_id === sectionId && s.is_published)
      .map((s) => ({
        id: s.id, slug: s.slug, item_type: 'section', content_type: s.content_type,
        title: s.title, path: s.path, display_type: s.display_type, tags: [],
        is_published: true, is_featured: false, sort_order: s.sort_order,
        created_at: s.createdDate, updated_at: s.updatedDate,
      }));

    const contentItems = section.content_type === 'story'
      ? stories.map((s) => ({
          id: s.id, slug: s.slug, item_type: 'content', content_type: 'story',
          title: s.title, tags: [], is_published: s.is_published, is_featured: false,
          created_at: s.createdDate, updated_at: s.updatedDate,
        }))
      : section.content_type === 'project'
        ? projects.filter((p) => p.is_published).map((p) => ({
            id: p.id, slug: p.slug, item_type: 'content', content_type: 'project',
            title: p.title, summary: p.summary, tags: p.technologies,
            is_published: p.is_published, is_featured: p.is_featured,
            sort_order: p.sort_order, created_at: p.createdDate, updated_at: p.updatedDate,
          }))
        : [];

    const allItems = [...childSections, ...contentItems];
    const paginated = allItems.slice(offset, offset + limit);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: paginated, total: allItems.length, limit, offset }),
    });
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

  // Mock sections list endpoint (GET /api/sections)
  await page.route(/\/api\/sections\/?(\?|$)/, async (route) => {
    await maybeDelay();
    const method = route.request().method();

    if (method === 'POST') {
      if (failRequests) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal server error' }) });
        return;
      }
      const body = route.request().postDataJSON();
      const newSection = createTestSection({
        ...body,
        id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        slug: body.title?.toLowerCase().replace(/\s+/g, '-') || 'new-section',
      });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newSection) });
      return;
    }

    if (failRequests) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal server error' }) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: sections,
        total: sections.length,
        limit: 20,
        offset: 0,
      }),
    });
  });

  // Mock section by ID endpoint (GET/PUT/DELETE /api/sections/{id})
  await page.route(/\/api\/sections\/(?!by-slug|navigation|resolve-path)[\w-]+$/, async (route) => {
    await maybeDelay();
    const method = route.request().method();
    const urlObj = new URL(route.request().url());
    const pathParts = urlObj.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (failRequests) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal server error' }) });
      return;
    }

    if (method === 'DELETE') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const existing = sections.find((s) => s.id === id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...(existing || {}), ...body, id }),
      });
      return;
    }

    // GET — search all sections (including nested) for editor support
    const section = sharedAllSections.find((s) => s.id === id) || sections.find((s) => s.id === id);
    if (section) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(section) });
    } else {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Section not found' }) });
    }
  });

  // Mock photo essays list endpoint
  await page.route('**/api/photo-essays?**', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: sharedPhotoEssayCards,
        total: sharedPhotoEssayCards.length,
        limit: 20,
        offset: 0,
      }),
    });
  });

  // Mock photo essays detail endpoint
  await page.route('**/api/photo-essays/*', async (route) => {
    // Only match detail requests, not the list endpoint or section routes
    const url = route.request().url();
    if (url.includes('?') || url.includes('/section/')) return route.continue();

    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sharedPhotoEssayDetail),
    });
  });

  // Resume PDF download endpoint (client-side fetch for download button)
  await page.route('**/api/resume/download-pdf', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'PDF generation failed' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: {
        'Content-Disposition': 'attachment; filename="Test_User_Resume.pdf"',
      },
      body: Buffer.from('%PDF-1.4 mock'),
    });
  });

  // Resume public endpoint
  await page.route('**/api/resume/public', async (route) => {
    await maybeDelay();

    if (failRequests) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sharedResume),
    });
  });

  // Mock contact form submission endpoint
  await page.route('**/api/contact', async (route) => {
    if (route.request().method() === 'POST') {
      await maybeDelay();

      if (failRequests) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
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
