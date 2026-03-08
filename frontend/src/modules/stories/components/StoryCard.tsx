import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { formatDate } from '@/shared/utils/formatDate';
import { stripEmptyParagraphs } from '@/shared/utils/htmlUtils';
import { Story } from '@/shared/types/api';
import { engagementConfig } from '@/config/engagement.config';
import { LazyStoryContent } from './LazyStoryContent';

// Pre-compiled regexes for splitLeadingImage
const MEDIA_IN_PARAGRAPH = /^<p>\s*(<img[^>]*>|<video[^>]*>[\s\S]*?<\/video>)\s*<\/p>/i;
const MEDIA_DIRECT = /^(<img[^>]*>|<video[^>]*>[\s\S]*?<\/video>)/i;

/**
 * Splits HTML content into a leading media element (image or video) and the rest.
 * The leading media is shown full-size above the truncated text.
 */
export function splitLeadingImage(html: string): { leadImage: string | null; rest: string } {
    const trimmed = stripEmptyParagraphs(html).trimStart();

    let match = trimmed.match(MEDIA_IN_PARAGRAPH);
    if (match) {
        return { leadImage: match[1], rest: trimmed.slice(match[0].length) };
    }
    match = trimmed.match(MEDIA_DIRECT);
    if (match) {
        return { leadImage: match[1], rest: trimmed.slice(match[0].length) };
    }
    return { leadImage: null, rest: html };
}

export const REACTION_ICONS = engagementConfig.reactionIcons;

function StoryMediaPreview({ leadImage, rest }: { leadImage: string | null; rest: string }) {
    return (
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
    );
}

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

            {!isDraft ? (
                <>
                    <StoryMediaPreview leadImage={leadImage} rest={rest} />
                    <Link href={storyPath} className="block mt-4" data-testid={`story-content-link-${story.id}`}>
                        <span className="btn btn--secondary btn--sm" data-testid={`story-read-more-${story.id}`}>
                            Read full story →
                        </span>
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
            ) : (
                <StoryMediaPreview leadImage={leadImage} rest={rest} />
            )}
        </div>
    );
});

StoryCard.displayName = 'StoryCard';
