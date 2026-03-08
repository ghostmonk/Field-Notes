import React, { useId } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import type { FeedDisplayProps } from '../types';

export function FeedDisplay<T>({ items, renderItem, onLoadMore, hasMore, keyExtractor = (_item: T, index: number) => String(index) }: FeedDisplayProps<T>) {
    const skipTargetId = useId();
    return (
        <section aria-label="Content feed" className="mt-4">
            <a href={`#${skipTargetId}`} className="skip-to-content">
                Skip past feed
            </a>
            <InfiniteScroll
                dataLength={items.length}
                next={onLoadMore}
                hasMore={hasMore}
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
            {items.length > 5 && (
                <div className="text-center py-4">
                    <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="btn btn--secondary btn--sm"
                        data-testid="back-to-top"
                    >
                        Back to top
                    </button>
                </div>
            )}
            <div id={skipTargetId} tabIndex={-1} />
        </section>
    );
}
