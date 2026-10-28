import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { formatDate, formatDateShort } from '@/shared/utils/formatDate';
import { estimateReadingTime } from '@/shared/utils/readingTime';
import { stripEmptyParagraphs } from '@/shared/utils/htmlUtils';
import { Story } from '@/shared/types/api';
import { Badge, Button } from '@/components/ui';
import { getStoryPath, canEditStory } from './StoryCard';

function extractExcerpt(html: string, maxLength = 160): string {
    const stripped = stripEmptyParagraphs(html)
        .replace(/<img[^>]*>/gi, '')
        .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    if (stripped.length <= maxLength) return stripped;
    return stripped.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

export interface StoryFeedItemProps {
    story: Story;
    session: Session | null;
    onEdit: (story: Story) => void;
    onDelete: (story: Story) => Promise<void>;
    deleteLoading: boolean;
    basePath?: string;
}

export const StoryFeedItem = React.memo(({
    story,
    session,
    onEdit,
    onDelete,
    deleteLoading,
    basePath,
}: StoryFeedItemProps) => {
    const isDraft = !story.is_published;
    const storyPath = getStoryPath(story, basePath);
    const canEdit = canEditStory(session, story);
    const excerpt = useMemo(() => extractExcerpt(story.content || ''), [story.content]);
    const readTime = useMemo(() => estimateReadingTime(story.content || ''), [story.content]);

    return (
        <article className={`feed-item${isDraft ? ' feed-item--draft' : ''}`} data-testid={`story-feed-item-${story.id}`}>
            <div className="feed-item__content">
                <div className="feed-item__header">
                    {isDraft ? (
                        <h2 className="feed-item__title feed-item__title--draft">
                            {story.title}
                            <Badge variant="draft" data-testid={`story-draft-badge-${story.id}`}>
                                DRAFT
                            </Badge>
                        </h2>
                    ) : (
                        <Link href={storyPath} className="feed-item__link" data-testid={`story-title-link-${story.id}`}>
                            <h2 className="feed-item__title">{story.title}</h2>
                        </Link>
                    )}
                    {canEdit && (
                        <div className="feed-item__actions">
                            <Button onClick={() => onEdit(story)} variant="primary" size="sm" data-testid={`story-edit-${story.id}`}>
                                Edit
                            </Button>
                            {isDraft && (
                                <Button onClick={() => onDelete(story)} disabled={deleteLoading} variant="danger" size="sm" data-testid={`story-delete-${story.id}`}>
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {excerpt && !isDraft && (
                    <p className="feed-item__excerpt">{excerpt}</p>
                )}
            </div>
            <div className="feed-item__meta">
                <time className="feed-item__date" dateTime={story.createdDate} title={formatDate(story.createdDate)}>
                    {formatDateShort(story.createdDate)}
                </time>
                <span className="feed-item__reading-time">{readTime}</span>
            </div>
        </article>
    );
});

StoryFeedItem.displayName = 'StoryFeedItem';
