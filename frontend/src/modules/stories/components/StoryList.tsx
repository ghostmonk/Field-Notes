import React, { useEffect, useMemo, useCallback, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Story, PaginatedResponse, BulkCountsResponse } from '@/shared/types/api';
import { useFetchStories, useStoryMutations } from '../hooks';
import { StoriesListSkeleton } from '@/components/LoadingSkeletons';
import { EmptyState } from '@/components/EmptyState';
import { StoryCard } from './StoryCard';
import apiClient from '@/shared/lib/api-client';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

interface StoriesProps {
    initialData?: PaginatedResponse<Story>;
    initialError?: string;
    basePath?: string;
}

const Stories: React.FC<StoriesProps> = ({ initialData, initialError, basePath }) => {
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
    const confirm = useConfirm();
    const { showToast } = useToast();
    const [engagementCounts, setEngagementCounts] = useState<BulkCountsResponse['counts']>({});

    // Fetch engagement counts only for newly loaded stories
    useEffect(() => {
        const publishedStories = stories.filter(s => s.is_published);
        const newStories = publishedStories.filter(s => !engagementCounts[`story:${s.id}`]);
        if (newStories.length === 0) return;

        const fetchCounts = async () => {
            try {
                const targets = newStories.map(s => ({ type: 'story', id: s.id }));
                const response = await apiClient.engagement.getBulkCounts({ targets });
                setEngagementCounts(prev => ({ ...prev, ...response.counts }));
            } catch (err) {
                console.error('Failed to fetch engagement counts:', err);
            }
        };

        fetchCounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- engagementCounts excluded to avoid refetch loop
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
        
        const confirmed = await confirm({
            title: 'Delete Story',
            message: `Are you sure you want to delete "${story.title}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!confirmed) return;

        const success = await deleteStory(story.id);
        if (success) {
            showToast('Story deleted');
            resetStories();
        }
    }, [session, router, deleteStory, resetStories, confirm, showToast]);

    // Memoize the story list to prevent unnecessary re-renders
    const storyItems = useMemo(() => {
        return stories.map(story => (
            <StoryCard
                key={story.id}
                story={story}
                session={session}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deleteLoading={deleteLoading}
                engagementCounts={engagementCounts[`story:${story.id}`]}
                basePath={basePath}
            />
        ));
    }, [stories, session, handleEdit, handleDelete, deleteLoading, engagementCounts, basePath]);

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
            <EmptyState
                title="No stories yet"
                description="This is where stories will appear once published."
                action={session?.user?.role === 'admin' ? { label: 'Write a Story', href: '/editor' } : undefined}
            />
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
