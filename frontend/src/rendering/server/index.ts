/**
 * Server-side rendering utilities.
 * Centralizes SSR patterns for pages.
 */

export { getStorySSR } from './stories';
export {
  createStoryErrorProps,
  processStoryDataSSR,
  type StorySSRProps,
} from './helpers';
