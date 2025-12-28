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
