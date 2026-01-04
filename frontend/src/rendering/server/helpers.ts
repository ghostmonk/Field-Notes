/**
 * Server-side rendering helper utilities.
 * Provides common patterns for SSR data processing.
 */

import { getBaseUrl } from '@/shared/utils/urls';
import { getDefaultOGImage, extractImageFromContentServer } from '@/shared/utils/extractImageFromContent';

export interface StorySSRProps {
  story: any | null;
  error?: string;
  ogImage: string;
  excerpt: string;
}

/**
 * Creates standardized error props for story pages.
 */
export function createStoryErrorProps(error: string, excerpt?: string): StorySSRProps {
  return {
    story: null,
    error,
    ogImage: `${getBaseUrl()}${getDefaultOGImage()}`,
    excerpt: excerpt || 'Browse stories and updates on Turbulence'
  };
}

/**
 * Processes story data on the server for SSR.
 * Extracts OG image and creates excerpt from content.
 */
export async function processStoryDataSSR(story: any): Promise<{ ogImage: string; excerpt: string }> {
  const extractedImage = await extractImageFromContentServer(story.content);
  let excerpt = '';

  try {
    const cheerio = await import('cheerio');
    const $ = cheerio.load(story.content);
    $('script, style').remove();
    const text = $.text();
    const normalized = text.replace(/\s+/g, ' ').trim();
    const metaLength = 157;
    excerpt = normalized.length > metaLength ? normalized.substring(0, metaLength) + '...' : normalized;
  } catch (error) {
    console.error('Error creating excerpt:', error);
    excerpt = 'Browse stories and updates on Turbulence';
  }

  let ogImage = extractedImage;
  if (ogImage && ogImage.startsWith('/')) {
    ogImage = `${getBaseUrl()}${ogImage}`;
  }
  ogImage = ogImage || `${getBaseUrl()}${getDefaultOGImage()}`;

  return { ogImage, excerpt };
}
