/**
 * Server-side rendering functions for story pages.
 */

import { GetServerSideProps } from 'next';
import { StorySSRProps, createStoryErrorProps, processStoryDataSSR } from './helpers';

/**
 * SSR handler for individual story pages.
 * Fetches story by slug and processes for OG meta tags.
 */
export const getStorySSR: GetServerSideProps<StorySSRProps> = async (context) => {
  const { slug } = context.params || {};

  if (!slug || typeof slug !== 'string') {
    return { props: createStoryErrorProps('Story not found') };
  }

  try {
    const apiUrl = `${process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL}/stories/slug/${slug}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return { props: createStoryErrorProps('Story not found') };
      }

      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return { props: createStoryErrorProps(errorData.detail || `Error: ${response.statusText}`) };
    }

    const story = await response.json();
    const { ogImage, excerpt } = await processStoryDataSSR(story);

    return {
      props: {
        story,
        ogImage,
        excerpt
      }
    };
  } catch (error) {
    console.error('Error fetching story by slug:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load story';
    return { props: createStoryErrorProps(errorMessage) };
  }
};
