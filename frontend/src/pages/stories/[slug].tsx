import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { formatDate } from '@/shared/utils/formatDate';
import { getStoryUrl } from '@/shared/utils/urls';
import { LazyStoryContent } from '@/modules/stories';
import { EngagementProvider, ReactionBar, CommentSection, useEngagementContext } from '@/modules/engagement';
import { getStorySSR, StorySSRProps } from '@/rendering/server';

function StoryEngagement() {
  const { reactions, comments, isLoading, toggleReaction, addComment, deleteComment } = useEngagementContext();

  return (
    <>
      <div className="mt-8 border-t pt-8">
        <ReactionBar
          reactions={reactions}
          onToggle={toggleReaction}
        />
      </div>
      <div className="mt-8">
        <CommentSection
          comments={comments}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

export default function StoryPage({ story, error, ogImage, excerpt }: StorySSRProps) {
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

        <EngagementProvider targetType="story" targetId={story.id}>
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

            <StoryEngagement />

            <div className="mt-10 pt-6">
              <Link href="/" className="btn btn--secondary btn--sm">
                &larr; Back to all stories
              </Link>
            </div>
          </article>
        </EngagementProvider>
      </div>
    </>
  );
}

// SSR handler from rendering module
export const getServerSideProps = getStorySSR;
