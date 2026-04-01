import React from 'react';
import { formatDate, formatRelativeDate } from '@/shared/utils/formatDate';
import { estimateReadingTime } from '@/shared/utils/readingTime';
import { Story } from '@/shared/types/api';
import { AdminEditButton } from '@/components/AdminEditButton';
import { LazyStoryContent } from './LazyStoryContent';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';

interface StoryDetailProps {
    story: Story;
    onEdit?: () => void;
    children?: React.ReactNode;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({ story, onEdit, children }) => {
    return (
        <article className="card" data-testid="story-article">
            <ReadingProgressBar />
            <div className="flex items-center justify-between mb-2">
                <h1 className="story-title" data-testid="story-page-title">{story.title}</h1>
                <AdminEditButton
                    onClick={onEdit}
                    data-testid="story-edit-button"
                />
            </div>

            <div className="flex items-center text-sm mb-8">
                <span style={{ color: 'var(--color-text-tertiary)' }} title={formatDate(story.createdDate)}>{formatRelativeDate(story.createdDate)}</span>
                {story.updatedDate !== story.createdDate && (
                    <span className="text-xs ml-2 opacity-70" style={{ color: 'var(--color-text-tertiary)' }} title={formatDate(story.updatedDate)}>
                        (Updated: {formatRelativeDate(story.updatedDate)})
                    </span>
                )}
                <span className="mx-2" style={{ color: 'var(--color-text-tertiary)' }} aria-hidden="true">·</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{estimateReadingTime(story.content || '')}</span>
            </div>

            <LazyStoryContent
                content={story.content}
                className="prose--card lg:prose-lg dark:prose-invert"
                data-testid="story-content"
            />

            {children}
        </article>
    );
};
