import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import type { FeedDisplayProps } from '../types';

export function FeedDisplay<T>({ items, renderItem, onLoadMore, hasMore }: FeedDisplayProps<T>) {
    return (
        <div className="mt-4">
            <InfiniteScroll
                dataLength={items.length}
                next={onLoadMore}
                hasMore={hasMore}
                loader={
                    <div className="flex justify-center items-center py-4">
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
                        <React.Fragment key={index}>
                            {renderItem(item)}
                        </React.Fragment>
                    ))}
                </div>
            </InfiniteScroll>
        </div>
    );
}
