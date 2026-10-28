import { useState } from 'react';
import type { CardGridDisplayProps } from '../types';

const PAGE_SIZE = 12;

export function CardGridDisplay<T>({ items = [] as unknown as T[], renderItem }: CardGridDisplayProps<T>) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const safeItems = items ?? [];
    const visibleItems = safeItems.slice(0, visibleCount);
    const hasMore = visibleCount < safeItems.length;

    return (
        <>
            <div className="project-list" data-testid="card-grid-display">
                {visibleItems.map((item, index) => (
                    <div key={index}>
                        {renderItem(item)}
                    </div>
                ))}
            </div>
            {hasMore && (
                <div className="project-list__more">
                    <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        className="project-list__more-btn"
                        data-testid="show-more-button"
                    >
                        Show More ({safeItems.length - visibleCount} remaining)
                    </button>
                </div>
            )}
        </>
    );
}
