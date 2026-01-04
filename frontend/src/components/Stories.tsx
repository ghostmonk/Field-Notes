import React, { useEffect, useMemo, useCallback, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDate } from "@/shared/utils/formatDate";
import { Story, PaginatedResponse, BulkCountsResponse } from '@/types/api';
import { useFetchStories, useStoryMutations } from '@/hooks/stories';
import { StoriesListSkeleton } from '@/components/LoadingSkeletons';
import { LazyStoryContent } from '@/components/LazyStoryContent';
import apiClient from '@/shared/lib/api-client';

const REACTION_ICONS: Record<string, string> = {
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
const getStoryPath = (story: Story): string => {
    if (!story.slug || story.slug.trim() === '') {
        return `/stories/${story.id}`;
    }
    return `/stories/${story.slug}`;
};

const canEditStory = (session: Session | null, story: Story): boolean => {
    if (!session?.user) return false;
    // Admin can edit any story
    if (session.user.role === 'admin') return true;
    // Owner can edit their own story
    if (story.user_id && session.user.id === story.user_id) return true;
    return false;
};

interface EngagementCounts {
    reactions: Record<string, number>;
    comment_count: number;
}

const StoryItem = React.memo(({
    story,
    session,
    onEdit,
    onDelete,
    deleteLoading,
    engagementCounts
}: {
    story: Story,
    session: Session | null,
    onEdit: (story: Story) => void,
    onDelete: (story: Story) => Promise<void>,
    deleteLoading: boolean,
    engagementCounts?: EngagementCounts
}) => {
    const isDraft = !story.is_published;
    const storyPath = getStoryPath(story);
    const canEdit = canEditStory(session, story);

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
    const [engagementCounts, setEngagementCounts] = useState<BulkCountsResponse['counts']>({});

    // Initialize data on component mount
    useEffect(() => {
        resetStories();
    }, [resetStories]);

    // Fetch engagement counts when stories change
    useEffect(() => {
        const publishedStories = stories.filter(s => s.is_published);
        if (publishedStories.length === 0) return;

        const fetchCounts = async () => {
            try {
                const targets = publishedStories.map(s => ({ type: 'story', id: s.id }));
                const response = await apiClient.engagement.getBulkCounts({ targets });
                setEngagementCounts(response.counts);
            } catch (err) {
                console.error('Failed to fetch engagement counts:', err);
            }
        };

        fetchCounts();
    }, [stories]);

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
                engagementCounts={engagementCounts[`story:${story.id}`]}
            />
        ));
    }, [stories, session, handleEdit, handleDelete, deleteLoading, engagementCounts]);

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
                {session?.user?.role === 'admin' && (
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
