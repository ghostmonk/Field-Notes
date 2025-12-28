/**
 * Combined fixture exports for E2E tests.
 */

export { test, expect, defaultMockSession } from './api-mock.fixture';
export type { MockSession } from './auth.fixture';
export type { MockStory, MockPaginatedResponse, ApiMockOptions } from './api-mock.fixture';
export { createMockStory, createMockStoriesResponse, sampleStories, setupApiMocks } from './api-mock.fixture';
export { TEST_STORY_IDS, TEST_STORY_SLUGS } from '../test-data';
