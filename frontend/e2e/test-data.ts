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
    image_url: null,
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
    image_url: null,
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

// ============================================================================
// Sections
// ============================================================================

export interface TestSection {
  id: string;
  title: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  display_type: string;
  content_type: string;
  nav_visibility: string;
  sort_order: number;
  is_published: boolean;
  createdDate: string;
  updatedDate: string;
}

export const TEST_SECTION_IDS = {
  BLOG: 'section-blog',
  ABOUT: 'section-about',
  PROJECTS: 'section-projects',
  CONTACT: 'section-contact',
  PHOTO_ESSAYS: '507f1f77bcf86cd799439019',
} as const;

export const sampleSections: TestSection[] = [
  {
    id: TEST_SECTION_IDS.BLOG,
    title: 'Blog',
    slug: 'blog',
    icon: 'home',
    parent_id: null,
    display_type: 'feed',
    content_type: 'story',
    nav_visibility: 'main',
    sort_order: 0,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_SECTION_IDS.ABOUT,
    title: 'About',
    slug: 'about',
    icon: 'user',
    parent_id: null,
    display_type: 'static-page',
    content_type: 'page',
    nav_visibility: 'main',
    sort_order: 1,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_SECTION_IDS.PROJECTS,
    title: 'Projects',
    slug: 'projects',
    icon: 'folder',
    parent_id: null,
    display_type: 'card-grid',
    content_type: 'project',
    nav_visibility: 'main',
    sort_order: 2,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_SECTION_IDS.CONTACT,
    title: 'Contact',
    slug: 'contact',
    icon: 'mail',
    parent_id: null,
    display_type: 'static-page',
    content_type: 'page',
    nav_visibility: 'main',
    sort_order: 3,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
  {
    id: TEST_SECTION_IDS.PHOTO_ESSAYS,
    title: 'Photo Essays',
    slug: 'photo-essays',
    icon: 'photograph',
    parent_id: null,
    display_type: 'gallery',
    content_type: 'photo_essay',
    nav_visibility: 'main',
    sort_order: 4,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  },
];

/**
 * Helper to create a mock section with defaults.
 */
export function createTestSection(overrides: Partial<TestSection> = {}): TestSection {
  return {
    id: `section-${Date.now()}`,
    title: 'Test Section',
    slug: 'test-section',
    icon: 'default',
    parent_id: null,
    display_type: 'feed',
    content_type: 'story',
    nav_visibility: 'main',
    sort_order: 0,
    is_published: true,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
    ...overrides,
  };
}

// ============================================================================
// Engagement (Reactions & Comments)
// ============================================================================

export interface TestReactionCounts {
  counts: Record<string, number>;
  user_reactions: string[];
  details: Record<string, Array<{ user_id: string; user_name: string }>>;
}

export interface TestComment {
  id: string;
  target_type: string;
  target_id: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  mentions: Array<{ user_id: string; user_name: string }>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  replies: TestComment[];
}

export const TEST_COMMENT_IDS = {
  PARENT: 'comment-1',
  REPLY: 'comment-2',
  WITH_SPECIAL_CHARS: 'comment-3',
} as const;

/**
 * Sample reactions for a story.
 */
export const sampleReactions: TestReactionCounts = {
  counts: {
    thumbup: 3,
    heart: 2,
  },
  user_reactions: [],
  details: {
    thumbup: [
      { user_id: 'user-1', user_name: 'Alice' },
      { user_id: 'user-2', user_name: 'Bob' },
      { user_id: 'user-3', user_name: "O'Brien" },
    ],
    heart: [
      { user_id: 'user-1', user_name: 'Alice' },
      { user_id: 'user-4', user_name: 'José' },
    ],
  },
};

/**
 * Sample comments for a story.
 * Raw content stored in DB - React auto-escapes on render for XSS protection.
 */
export const sampleComments: TestComment[] = [
  {
    id: TEST_COMMENT_IDS.PARENT,
    target_type: 'story',
    target_id: TEST_STORY_IDS.PUBLISHED,
    parent_id: null,
    user_id: 'user-1',
    user_name: 'Alice',
    user_avatar: null,
    content: 'Great story!',
    mentions: [],
    created_at: FIXED_TIMESTAMP,
    updated_at: FIXED_TIMESTAMP,
    deleted_at: null,
    replies: [
      {
        id: TEST_COMMENT_IDS.REPLY,
        target_type: 'story',
        target_id: TEST_STORY_IDS.PUBLISHED,
        parent_id: TEST_COMMENT_IDS.PARENT,
        user_id: 'user-2',
        user_name: 'Bob',
        user_avatar: null,
        content: 'I agree!',
        mentions: [],
        created_at: FIXED_TIMESTAMP,
        updated_at: FIXED_TIMESTAMP,
        deleted_at: null,
        replies: [],
      },
    ],
  },
  {
    id: TEST_COMMENT_IDS.WITH_SPECIAL_CHARS,
    target_type: 'story',
    target_id: TEST_STORY_IDS.PUBLISHED,
    parent_id: null,
    user_id: 'user-3',
    user_name: "O'Brien",
    user_avatar: null,
    content: "Let's go! <script>alert('xss')</script>", // Raw content - React escapes on render
    mentions: [],
    created_at: FIXED_TIMESTAMP,
    updated_at: FIXED_TIMESTAMP,
    deleted_at: null,
    replies: [],
  },
];

/**
 * Helper to create mock reaction counts.
 */
export function createTestReactions(overrides: Partial<TestReactionCounts> = {}): TestReactionCounts {
  return {
    counts: {},
    user_reactions: [],
    details: {},
    ...overrides,
  };
}

/**
 * Helper to create a mock comment.
 */
export function createTestComment(overrides: Partial<TestComment> = {}): TestComment {
  return {
    id: `comment-${Date.now()}`,
    target_type: 'story',
    target_id: TEST_STORY_IDS.PUBLISHED,
    parent_id: null,
    user_id: 'test-user',
    user_name: 'Test User',
    user_avatar: null,
    content: 'Test comment',
    mentions: [],
    created_at: FIXED_TIMESTAMP,
    updated_at: FIXED_TIMESTAMP,
    deleted_at: null,
    replies: [],
    ...overrides,
  };
}

// ============================================================================
// Photo Essays
// ============================================================================

export interface TestPhotoEssayCard {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  is_published: boolean;
  photo_count: number;
  section_id: string;
  createdDate: string;
  updatedDate: string;
}

export interface TestPhotoEssayPhoto {
  url: string;
  caption?: string;
  width: number;
  height: number;
  sort_order: number;
}

export interface TestPhotoEssay {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  photos: TestPhotoEssayPhoto[];
  is_published: boolean;
  section_id: string;
  user_id: string;
  createdDate: string;
  updatedDate: string;
}

export const samplePhotoEssayCards: TestPhotoEssayCard[] = [
  {
    id: '507f1f77bcf86cd799439020',
    title: 'Trip to Japan',
    description: 'Cherry blossoms and temples',
    cover_image_url: 'https://example.com/japan-cover.jpg',
    is_published: true,
    photo_count: 5,
    section_id: TEST_SECTION_IDS.PHOTO_ESSAYS,
    createdDate: '2025-06-15T10:00:00Z',
    updatedDate: '2025-06-15T10:00:00Z',
  },
  {
    id: '507f1f77bcf86cd799439021',
    title: 'West Coast Trail',
    description: 'A week on the Pacific coast',
    cover_image_url: 'https://example.com/wct-cover.jpg',
    is_published: true,
    photo_count: 8,
    section_id: TEST_SECTION_IDS.PHOTO_ESSAYS,
    createdDate: '2025-05-10T10:00:00Z',
    updatedDate: '2025-05-10T10:00:00Z',
  },
];

// ============================================================================
// Resume
// ============================================================================

export const sampleResume = {
  id: 'resume-1',
  user_id: 'user-1',
  contact: {
    full_name: 'Test User',
    title: 'Staff Engineer',
    email: 'test@example.com',
    phone: '555-0100',
    location: 'Montreal, QC',
    linkedin: 'https://linkedin.com/in/testuser',
    github: 'https://github.com/testuser',
    website: 'https://testuser.com',
  },
  summary: 'Experienced engineer with 10 years of experience.',
  work_experience: [
    {
      company: 'Acme Corp',
      company_url: 'https://acme.com',
      title: 'Staff Engineer',
      start_date: 'Jan 2020',
      end_date: undefined,
      current: true,
      description: '- Built distributed systems.\n- Led team of 5.',
      technologies: ['TypeScript', 'Python'],
      hide_from_downloads: false,
    },
  ],
  education: [
    {
      institution: 'MIT',
      degree: 'MSc',
      field_of_study: 'Computer Science',
      start_date: '2015',
      end_date: '2017',
    },
  ],
  skills: ['TypeScript', 'Python', 'React'],
  achievements: ['Won hackathon', 'Published paper'],
  createdDate: FIXED_TIMESTAMP,
  updatedDate: FIXED_TIMESTAMP,
};

export const samplePhotoEssayDetail: TestPhotoEssay = {
  id: '507f1f77bcf86cd799439020',
  title: 'Trip to Japan',
  description: 'Cherry blossoms and temples',
  cover_image_url: 'https://example.com/japan-cover.jpg',
  photos: [
    { url: 'https://example.com/japan-1.jpg', caption: 'Fushimi Inari', width: 1920, height: 1080, sort_order: 0 },
    { url: 'https://example.com/japan-2.jpg', caption: 'Kinkaku-ji', width: 1200, height: 1600, sort_order: 1 },
    { url: 'https://example.com/japan-3.jpg', width: 1920, height: 1280, sort_order: 2 },
  ],
  is_published: true,
  section_id: TEST_SECTION_IDS.PHOTO_ESSAYS,
  user_id: '507f1f77bcf86cd799439099',
  createdDate: '2025-06-15T10:00:00Z',
  updatedDate: '2025-06-15T10:00:00Z',
};
