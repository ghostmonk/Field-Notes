import React, { useCallback, useId, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import type { FeedDisplayProps } from '../types';
import { Button } from '@/components/ui';

export function FeedDisplay<T>({ items: rawItems, renderItem, onLoadMore, hasMore, keyExtractor = (_item: T, index: number) => String(index) }: FeedDisplayProps<T>) {
    const items = rawItems ?? [];
    const skipTargetId = useId();
    const [loadError, setLoadError] = useState(false);

    const handleLoadMore = useCallback(async () => {
        setLoadError(false);
        try {
            await onLoadMore();
        } catch {
            setLoadError(true);
        }
    }, [onLoadMore]);

    return (
        <section aria-label="Content feed" className="mt-4">
            <a href={`#${skipTargetId}`} className="skip-to-content">
                Skip past feed
            </a>
            <InfiniteScroll
                dataLength={items.length}
                next={handleLoadMore}
                hasMore={hasMore && !loadError}
                loader={
                    <div className="flex justify-center items-center py-4" role="status" aria-label="Loading more content">
                        <ClipLoader color="var(--color-brand-primary)" loading={true} size={35} />
                    </div>
                }
                endMessage={
                    <div className="text-center py-4 text-text-secondary">
                        You&apos;ve reached the end
                    </div>
                }
            >
                <div className="flex flex-col space-y-6">
                    {items.map((item, index) => (
                        <React.Fragment key={keyExtractor(item, index)}>
                            {renderItem(item)}
                        </React.Fragment>
                    ))}
                </div>
            </InfiniteScroll>
            {loadError && (
                <div className="feed-load-error" role="alert">
                    <p>Failed to load more content.</p>
                    <Button variant="secondary" size="sm" onClick={handleLoadMore}>
                        Retry
                    </Button>
                </div>
            )}
            {items.length > 5 && (
                <div className="text-center py-4">
                    <Button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        variant="secondary"
                        size="sm"
                        data-testid="back-to-top"
                    >
                        Back to top
                    </Button>
                </div>
            )}
            <div id={skipTargetId} tabIndex={-1} />
        </section>
    );
}
