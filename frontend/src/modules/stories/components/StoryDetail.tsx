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
        <article className="story-detail" data-testid="story-article">
            <ReadingProgressBar />
            <header className="story-detail__header">
                <div className="story-detail__admin">
                    <AdminEditButton
                        onClick={onEdit}
                        data-testid="story-edit-button"
                    />
                </div>
                <h1 className="story-detail__title" data-testid="story-page-title">{story.title}</h1>
                <div className="story-detail__meta">
                    <time
                        className="story-detail__date"
                        dateTime={story.createdDate}
                        title={formatDate(story.createdDate)}
                    >
                        {formatRelativeDate(story.createdDate)}
                    </time>
                    {story.updatedDate !== story.createdDate && (
                        <span className="story-detail__updated" title={formatDate(story.updatedDate)}>
                            Updated {formatRelativeDate(story.updatedDate)}
                        </span>
                    )}
                    <span className="story-detail__separator" aria-hidden="true">/</span>
                    <span className="story-detail__reading-time">{estimateReadingTime(story.content || '')}</span>
                </div>
            </header>

            <LazyStoryContent
                content={story.content}
                className="prose"
                data-testid="story-content"
            />

            {story.tags?.length > 0 && (
                <footer className="story-detail__footer">
                    <div className="story-detail__tags">
                        {story.tags.map((tag) => (
                            <span key={tag} className="story-detail__tag">{tag}</span>
                        ))}
                    </div>
                </footer>
            )}

            {children}
        </article>
    );
};
