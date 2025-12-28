import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { formatDate } from '@/utils/formatDate';
import { getStoryUrl } from '@/utils/urls';
import { Story } from '@/types/api';
import { LazyStoryContent } from '@/components/LazyStoryContent';
import { extractImageFromContentServer, getDefaultOGImage } from '@/utils/extractImageFromContent';
import { getBaseUrl } from '@/utils/urls';

interface StoryPageProps {
  story: Story | null;
  error?: string;
  ogImage: string;
  excerpt: string;
}

export default function StoryPage({ story, error, ogImage, excerpt }: StoryPageProps) {
  const canonicalUrl = story?.slug ? getStoryUrl(story.slug) : '';
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="story-error">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-semibold">Error Loading Story</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <Link href="/" className="btn btn--primary" data-testid="story-error-home-link">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <h2 className="loading-title">Loading...</h2>
        </div>
      </div>
    );
  }
  return (
    <>
      <Head>
        <title>{`${story.title} | Turbulence Blog`}</title>
        <meta name="description" content={excerpt || `${story.title} - Read the full story on ghostmonk.com`} />
        <meta property="og:title" content={story.title} />
        <meta property="og:description" content={excerpt || `${story.title} - Read the full story on ghostmonk.com`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={`Image from ${story.title}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:title" content={story.title} />
        <meta name="twitter:description" content={excerpt || `${story.title} - Read the full story on ghostmonk.com`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImage} />
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      
      <div style={{margin: '0 auto', maxWidth: '800px', padding: '2rem 1rem'}}>
        <Link href="/" className="inline-block mb-8 btn btn--secondary btn--sm" data-testid="story-back-link">
          &larr; Back to all stories
        </Link>

        <article className="card" data-testid="story-article">
          <h1 className="story-title" data-testid="story-page-title">{story.title}</h1>
          
          <div className="flex items-center text-sm mb-8">
            <span className="text-gray-400">{formatDate(story.createdDate)}</span>
            {story.updatedDate !== story.createdDate && (
              <span className="text-gray-400 text-xs ml-2 opacity-70">
                (Updated: {formatDate(story.updatedDate)})
              </span>
            )}
          </div>
          
          <LazyStoryContent
            content={story.content}
            className="prose--card lg:prose-lg dark:prose-invert dark:text-gray-200"
            data-testid="story-content"
          />
          
          <div className="mt-10 pt-6">
            <Link href="/" className="btn btn--secondary btn--sm">
              &larr; Back to all stories
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}

function createErrorProps(error: string, excerpt?: string): StoryPageProps {
  return {
    story: null,
    error,
    ogImage: `${getBaseUrl()}${getDefaultOGImage()}`,
    excerpt: excerpt || 'Browse stories and updates on Turbulence'
  };
}

async function processStoryDataSSR(story: any): Promise<{ ogImage: string; excerpt: string }> {
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

export const getServerSideProps: GetServerSideProps<StoryPageProps> = async (context) => {
  const { slug } = context.params || {};

  if (!slug || typeof slug !== 'string') {
    return { props: createErrorProps('Story not found') };
  }

  try {
    // Use the API endpoint directly since we're on the server
    const apiUrl = `${process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL}/stories/slug/${slug}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { props: createErrorProps('Story not found') };
      }
      
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return { props: createErrorProps(errorData.detail || `Error: ${response.statusText}`) };
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
    return { props: createErrorProps(errorMessage) };
  }
}; 
