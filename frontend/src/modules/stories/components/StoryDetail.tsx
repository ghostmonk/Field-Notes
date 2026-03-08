import React from 'react';
import { formatDate, formatRelativeDate } from '@/shared/utils/formatDate';
import { estimateReadingTime } from '@/shared/utils/readingTime';
import { Story } from '@/shared/types/api';
import { LazyStoryContent } from './LazyStoryContent';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';

interface StoryDetailProps {
    story: Story;
    children?: React.ReactNode;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({ story, children }) => {
    return (
        <article className="card" data-testid="story-article">
            <ReadingProgressBar />
            <h1 className="story-title" data-testid="story-page-title">{story.title}</h1>

            <div className="flex items-center text-sm mb-8">
                <span className="text-gray-400" title={formatDate(story.createdDate)}>{formatRelativeDate(story.createdDate)}</span>
                {story.updatedDate !== story.createdDate && (
                    <span className="text-gray-400 text-xs ml-2 opacity-70" title={formatDate(story.updatedDate)}>
                        (Updated: {formatRelativeDate(story.updatedDate)})
                    </span>
                )}
                <span className="text-gray-400 mx-2" aria-hidden="true">·</span>
                <span className="text-gray-400">{estimateReadingTime(story.content || '')}</span>
            </div>

            <LazyStoryContent
                content={story.content}
                className="prose--card lg:prose-lg dark:prose-invert dark:text-gray-200"
                data-testid="story-content"
            />

            {children}
        </article>
    );
};
