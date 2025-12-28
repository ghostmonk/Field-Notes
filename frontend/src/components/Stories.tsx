import React, { useEffect, useMemo, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDate } from "@/utils/formatDate";
import { Story, PaginatedResponse } from '@/types/api';
import { useFetchStories, useStoryMutations } from '@/hooks/stories';
import { StoriesListSkeleton } from '@/components/LoadingSkeletons';
import { LazyStoryContent } from '@/components/LazyStoryContent';

/**
 * Safely gets the story URL based on the slug
 * Falls back to ID if slug is not available
 */
const getStoryPath = (story: Story): string => {
    if (!story.slug || story.slug.trim() === '') {
        return `/stories/${story.id}`;
    }
    return `/stories/${story.slug}`;
};

const StoryItem = React.memo(({
    story,
    session,
    onEdit,
    onDelete,
    deleteLoading
}: {
    story: Story,
    session: Session | null,
    onEdit: (story: Story) => void,
    onDelete: (story: Story) => Promise<void>,
    deleteLoading: boolean
}) => {
    const isDraft = !story.is_published;
    const storyPath = getStoryPath(story);
    
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
                    {session && (
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
                <Link href={storyPath} className="block" data-testid={`story-content-link-${story.id}`}>
                    <LazyStoryContent
                        content={story.content}
                        className="story-content prose--card"
                    />
                    <div className="mt-4">
                        <span className="btn btn--secondary btn--sm" data-testid={`story-read-more-${story.id}`}>
                            Read full story →
                        </span>
                    </div>
                </Link>
            )}
            {isDraft && (
                <LazyStoryContent 
                    content={story.content}
                    className="story-content prose--card"
                />
            )}
        </div>
    );
});

StoryItem.displayName = 'StoryItem';

interface StoriesProps {
    initialData?: PaginatedResponse<Story>;
    initialError?: string;
}

const Stories: React.FC<StoriesProps> = ({ initialData, initialError }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const { 
        stories, 
        loading, 
        error, 
        fetchStories, 
        hasMore, 
        resetStories 
    } = useFetchStories({ initialData, initialError });
    const { deleteStory, loading: deleteLoading } = useStoryMutations();
    
    // Initialize data on component mount
    
    useEffect(() => {
        resetStories();
    }, [resetStories]);

    // Create stable callbacks for event handlers
    const handleEdit = useCallback((story: Story) => {
        if (!session) {
            router.push('/api/auth/signin');
            return;
        }
        
        router.push({
            pathname: '/editor',
            query: { id: story.id }
        });
    }, [session, router]);

    const handleDelete = useCallback(async (story: Story) => {
        if (!session) {
            router.push('/api/auth/signin');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${story.title}"? This action cannot be undone.`)) {
            return;
        }
        
        const success = await deleteStory(story.id);
        if (success) {
            resetStories(); // Refresh the list
        }
    }, [session, router, deleteStory, resetStories]);

    // Memoize the story list to prevent unnecessary re-renders
    const storyItems = useMemo(() => {
        return stories.map(story => (
            <StoryItem
                key={story.id}
                story={story}
                session={session}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deleteLoading={deleteLoading}
            />
        ));
    }, [stories, session, handleEdit, handleDelete, deleteLoading]);

    // Handle error state
    if (error) {
        return (
            <div className="error-state" data-testid="stories-error">
                <h3 className="error-state__title">Error Loading Stories</h3>
                <p className="error-state__message">{error}</p>
                <button
                    onClick={() => resetStories()}
                    className="btn btn--primary"
                    data-testid="stories-retry-button"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Handle initial loading state
    if (stories.length === 0 && loading) {
        return <StoriesListSkeleton count={3} />;
    }

    // Handle empty state
    if (stories.length === 0 && !loading) {
        return (
            <div className="empty-state" data-testid="stories-empty">
                <h2 className="empty-state__title">No stories found</h2>
                {session && (
                    <button
                        onClick={() => router.push('/editor')}
                        className="btn btn--primary"
                        data-testid="create-first-story-button"
                    >
                        Create Your First Story
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-4" data-testid="stories-list">
            <InfiniteScroll
                key="story-infinite-scroll"
                dataLength={stories.length}
                next={fetchStories}
                hasMore={hasMore}
                loader={
                    <div className="flex justify-center items-center py-4">
                        <ClipLoader color="var(--color-brand-primary)" loading={true} size={35} />
                    </div>
                }
                endMessage={
                    <div className="text-center py-4 text-text-secondary" data-testid="stories-end">
                        You&apos;ve reached the end
                    </div>
                }
            >
                <div className="flex flex-col space-y-6">
                    {storyItems}
                </div>
            </InfiniteScroll>
        </div>
    );
};

export default Stories;
