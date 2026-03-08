import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { formatDate } from '@/shared/utils/formatDate';
import { Story } from '@/shared/types/api';
import { LazyStoryContent } from './LazyStoryContent';

/**
 * Splits HTML content into a leading media element (image or video) and the rest.
 * The leading media is shown full-size above the truncated text.
 */
export function splitLeadingImage(html: string): { leadImage: string | null; rest: string } {
    // Strip leading whitespace and empty paragraphs (TipTap inserts <p></p> before block nodes)
    const trimmed = html.trimStart().replace(/^(<p>\s*<\/p>\s*)+/i, '');

    // Match <img> or <video>...</video> (possibly wrapped in <p>) at the very start
    const mediaInParagraph = /^<p>\s*(<img[^>]*>|<video[^>]*>[\s\S]*?<\/video>)\s*<\/p>/i;
    const mediaDirect = /^(<img[^>]*>|<video[^>]*>[\s\S]*?<\/video>)/i;

    let match = trimmed.match(mediaInParagraph);
    if (match) {
        return { leadImage: match[1], rest: trimmed.slice(match[0].length) };
    }
    match = trimmed.match(mediaDirect);
    if (match) {
        return { leadImage: match[1], rest: trimmed.slice(match[0].length) };
    }
    return { leadImage: null, rest: html };
}

export const REACTION_ICONS: Record<string, string> = {
    thumbup: '👍',
    heart: '❤️',
    surprise: '😮',
    celebrate: '🎉',
    insightful: '💡',
};

/**
 * Safely gets the story URL based on the slug
 * Falls back to ID if slug is not available
 */
export const getStoryPath = (story: Story, basePath?: string): string => {
    const prefix = basePath || '/stories';
    if (!story.slug || story.slug.trim() === '') {
        return `${prefix}/${story.id}`;
    }
    return `${prefix}/${story.slug}`;
};

export const canEditStory = (session: Session | null, story: Story): boolean => {
    if (!session?.user) return false;
    // Admin can edit any story
    if (session.user.role === 'admin') return true;
    // Owner can edit their own story
    if (story.user_id && session.user.id === story.user_id) return true;
    return false;
};

export interface EngagementCounts {
    reactions: Record<string, number>;
    comment_count: number;
}

export interface StoryCardProps {
    story: Story;
    session: Session | null;
    onEdit: (story: Story) => void;
    onDelete: (story: Story) => Promise<void>;
    deleteLoading: boolean;
    engagementCounts?: EngagementCounts;
    basePath?: string;
}

export const StoryCard = React.memo(({
    story,
    session,
    onEdit,
    onDelete,
    deleteLoading,
    engagementCounts,
    basePath
}: StoryCardProps) => {
    const isDraft = !story.is_published;
    const storyPath = getStoryPath(story, basePath);
    const canEdit = canEditStory(session, story);
    const { leadImage, rest } = useMemo(() => splitLeadingImage(story.content || ''), [story.content]);

    return (
        <div
            key={story.id}
            className={`card ${isDraft ? 'card--draft' : ''}`}
            data-testid={`story-card-${story.id}`}
        >
            <div className="story-header">
                <div className="story-header__actions">
                    {isDraft && (
                        <span className="badge badge--draft" data-testid={`story-draft-badge-${story.id}`}>
                            DRAFT
                        </span>
                    )}
                    {canEdit && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(story)}
                                className="btn btn--primary btn--sm"
                                data-testid={`story-edit-${story.id}`}
                            >
                                Edit
                            </button>
                            {isDraft && (
                                <button
                                    onClick={() => onDelete(story)}
                                    disabled={deleteLoading}
                                    className="btn btn--danger btn--sm"
                                    data-testid={`story-delete-${story.id}`}
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <Link
                    href={storyPath}
                    className={`${isDraft ? 'pointer-events-none' : ''}`}
                    data-testid={`story-title-link-${story.id}`}
                >
                    <h2
                        className={`story-title ${!isDraft ? 'story-title--link' : 'story-title--draft'}`}
                        title={story.title}
                        data-testid={`story-title-${story.id}`}
                    >
                        {story.title}
                    </h2>
                </Link>

                <div className="story-header__meta">
                    <span>{formatDate(story.createdDate)}</span>
                    {story.updatedDate !== story.createdDate && (
                        <span className="opacity-70">
                            (Updated: {formatDate(story.updatedDate)})
                        </span>
                    )}
                </div>
            </div>

            {!isDraft && (
                <>
                    <Link href={storyPath} className="block" data-testid={`story-content-link-${story.id}`}>
                        {leadImage && (
                            <LazyStoryContent
                                content={leadImage}
                                className="story-content prose--card"
                            />
                        )}
                        {rest.trim() && (
                            <LazyStoryContent
                                content={rest}
                                className="story-content prose--card story-content--truncated"
                            />
                        )}
                        <div className="mt-4">
                            <span className="btn btn--secondary btn--sm" data-testid={`story-read-more-${story.id}`}>
                                Read full story →
                            </span>
                        </div>
                    </Link>
                    {engagementCounts && (
                        <div className="mt-4 flex items-center justify-end gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {Object.entries(engagementCounts.reactions).length > 0 && (
                                <span className="flex items-center gap-3">
                                    {Object.entries(engagementCounts.reactions).map(([tag, count]) => (
                                        <span key={tag} className="flex items-center gap-1">
                                            {REACTION_ICONS[tag]} {count}
                                        </span>
                                    ))}
                                </span>
                            )}
                            {engagementCounts.comment_count > 0 && (
                                <span>💬 {engagementCounts.comment_count}</span>
                            )}
                        </div>
                    )}
                </>
            )}
            {isDraft && (
                <>
                    {leadImage && (
                        <LazyStoryContent
                            content={leadImage}
                            className="story-content prose--card"
                        />
                    )}
                    {rest.trim() && (
                        <LazyStoryContent
                            content={rest}
                            className="story-content prose--card story-content--truncated"
                        />
                    )}
                </>
            )}
        </div>
    );
});

StoryCard.displayName = 'StoryCard';
