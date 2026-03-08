import React, { useState } from 'react';
import type { CardGridDisplayProps } from '../types';

const PAGE_SIZE = 12;

export function CardGridDisplay<T>({ items, renderItem }: CardGridDisplayProps<T>) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const visibleItems = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    return (
        <>
            <div className="grid grid--responsive">
                {visibleItems.map((item, index) => (
                    <React.Fragment key={index}>
                        {renderItem(item)}
                    </React.Fragment>
                ))}
            </div>
            {hasMore && (
                <div className="text-center py-6">
                    <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        className="btn btn--secondary"
                        data-testid="show-more-button"
                    >
                        Show More ({items.length - visibleCount} remaining)
                    </button>
                </div>
            )}
        </>
    );
}
