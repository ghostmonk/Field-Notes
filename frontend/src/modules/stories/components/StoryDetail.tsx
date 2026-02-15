import React from 'react';
import { formatDate } from '@/shared/utils/formatDate';
import { Story } from '@/shared/types/api';
import { LazyStoryContent } from './LazyStoryContent';

interface StoryDetailProps {
    story: Story;
    children?: React.ReactNode;
}

export const StoryDetail: React.FC<StoryDetailProps> = ({ story, children }) => {
    return (
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

            {children}
        </article>
    );
};
