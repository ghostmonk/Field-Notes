/**
 * Shared test data for E2E tests.
 *
 * This file contains sample data used by both:
 * - Playwright route mocking (api-mock.fixture.ts)
 * - Express mock server (mock-server.ts)
 *
 * Keep this in sync to ensure consistent behavior between client-side
 * and SSR mocked responses.
 */

/**
 * Test story IDs and slugs - use these constants in tests for maintainability.
 * If values change, only this file needs updating.
 */
export const TEST_STORY_IDS = {
  PUBLISHED: 'story-1',
  DRAFT: 'story-2',
  WITH_IMAGES: 'story-3',
} as const;

export const TEST_STORY_SLUGS = {
  PUBLISHED: 'my-published-story',
  DRAFT: 'my-draft-story',
  WITH_IMAGES: 'story-with-images',
} as const;

export interface TestStory {
  id: string;
  title: string;
  content: string;
  slug: string;
  is_published: boolean;
  createdDate: string;
  updatedDate: string;
}

// Fixed timestamp for consistent test behavior across timezones
export const FIXED_TIMESTAMP = '2025-01-01T12:00:00.000Z';

/**
 * Sample stories used in tests.
 * Uses TEST_STORY_IDS and TEST_STORY_SLUGS constants for maintainability.
 */
export const sampleStories: TestStory[] = [
  {
    id: TEST_STORY_IDS.PUBLISHED,
    title: 'My Published Story',
    content: '<p>This is a published story with rich content.</p>',
    slug: TEST_STORY_SLUGS.PUBLISHED,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_STORY_IDS.DRAFT,
    title: 'My Draft Story',
    content: '<p>This draft is still in progress.</p>',
    slug: TEST_STORY_SLUGS.DRAFT,
    is_published: false,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_STORY_IDS.WITH_IMAGES,
    title: 'Story With Images',
    content: '<p>Story with an image:</p><img src="/test-image.jpg" alt="Test" width="800" height="600" />',
    slug: TEST_STORY_SLUGS.WITH_IMAGES,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
];

/**
 * Helper to create a mock story with defaults.
 */
export function createTestStory(overrides: Partial<TestStory> = {}): TestStory {
  return {
    id: `story-${Date.now()}`,
    title: 'Test Story Title',
    content: '<p>Test story content.</p>',
    slug: 'test-story',
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
    ...overrides,
  };
}

// ============================================================================
// Pages (About, Contact)
// ============================================================================

export interface TestPage {
  id: string;
  title: string;
  content: string;
  page_type: 'about' | 'contact';
  is_published: boolean;
  createdDate: string;
  updatedDate: string;
}

export const TEST_PAGE_IDS = {
  ABOUT: 'page-about-1',
  CONTACT: 'page-contact-1',
} as const;

export const samplePages: TestPage[] = [
  {
    id: TEST_PAGE_IDS.ABOUT,
    title: 'About Me',
    content: '<p>Welcome to my about page. I am a software developer passionate about building great products.</p>',
    page_type: 'about',
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_PAGE_IDS.CONTACT,
    title: 'Get In Touch',
    content: '<p>Feel free to reach out via email at <a href="mailto:test@example.com">test@example.com</a></p>',
    page_type: 'contact',
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
];

/**
 * Helper to create a mock page with defaults.
 */
export function createTestPage(overrides: Partial<TestPage> = {}): TestPage {
  return {
    id: `page-${Date.now()}`,
    title: 'Test Page',
    content: '<p>Test page content.</p>',
    page_type: 'about',
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
    ...overrides,
  };
}

// ============================================================================
// Projects
// ============================================================================

export interface TestProjectCard {
  id: string;
  title: string;
  slug: string;
  summary: string;
  technologies: string[];
  image_url: string | null;
  github_url: string | null;
  live_url: string | null;
  is_featured: boolean;
}

export interface TestProject extends TestProjectCard {
  content: string;
  is_published: boolean;
  sort_order: number;
  createdDate: string;
  updatedDate: string;
}

export const TEST_PROJECT_IDS = {
  FEATURED: 'project-1',
  REGULAR: 'project-2',
  NO_LINKS: 'project-3',
} as const;

export const TEST_PROJECT_SLUGS = {
  FEATURED: 'awesome-portfolio-site',
  REGULAR: 'api-integration-tool',
  NO_LINKS: 'personal-blog-engine',
} as const;

export const sampleProjects: TestProject[] = [
  {
    id: TEST_PROJECT_IDS.FEATURED,
    title: 'Awesome Portfolio Site',
    slug: TEST_PROJECT_SLUGS.FEATURED,
    summary: 'A modern portfolio website built with Next.js and TypeScript.',
    content: '<p>This is my portfolio website featuring a clean design and responsive layout.</p><h2>Features</h2><ul><li>Dark mode</li><li>Mobile-first design</li><li>Blog integration</li></ul>',
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS'],
    image_url: '/images/portfolio-preview.jpg',
    github_url: 'https://github.com/example/portfolio',
    live_url: 'https://example.com',
    is_featured: true,
    is_published: true,
    sort_order: 0,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_PROJECT_IDS.REGULAR,
    title: 'API Integration Tool',
    slug: TEST_PROJECT_SLUGS.REGULAR,
    summary: 'A command-line tool for testing and debugging API integrations.',
    content: '<p>Built to simplify API development workflows with automatic request/response logging.</p>',
    technologies: ['Python', 'Click', 'Rich'],
    image_url: null,
    github_url: 'https://github.com/example/api-tool',
    live_url: null,
    is_featured: false,
    is_published: true,
    sort_order: 1,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_PROJECT_IDS.NO_LINKS,
    title: 'Personal Blog Engine',
    slug: TEST_PROJECT_SLUGS.NO_LINKS,
    summary: 'A custom blog engine with markdown support and syntax highlighting.',
    content: '<p>A lightweight blog engine designed for developers who want full control over their content.</p>',
    technologies: ['Go', 'SQLite', 'HTMX'],
    image_url: '/images/blog-engine.png',
    github_url: null,
    live_url: null,
    is_featured: false,
    is_published: true,
    sort_order: 2,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
];

/**
 * Helper to create a mock project with defaults.
 */
export function createTestProject(overrides: Partial<TestProject> = {}): TestProject {
  const id = overrides.id || `project-${Date.now()}`;
  return {
    id,
    title: 'Test Project',
    slug: 'test-project',
    summary: 'A test project for E2E testing.',
    content: '<p>Test project content.</p>',
    technologies: ['TypeScript'],
    image_url: null,
    github_url: null,
    live_url: null,
    is_featured: false,
    is_published: true,
    sort_order: 0,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
    ...overrides,
  };
}

/**
 * Convert a full project to a project card (for listing responses).
 */
export function projectToCard(project: TestProject): TestProjectCard {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    technologies: project.technologies,
    image_url: project.image_url,
    github_url: project.github_url,
    live_url: project.live_url,
    is_featured: project.is_featured,
  };
}
