import React, { useState } from 'react';
import type { CardGridDisplayProps } from '../types';
import { Grid, Button } from '@/components/ui';

const PAGE_SIZE = 12;

export function CardGridDisplay<T>({ items, renderItem }: CardGridDisplayProps<T>) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const visibleItems = items.slice(0, visibleCount);
    const hasMore = visibleCount < items.length;

    return (
        <>
            <Grid variant="responsive">
                {visibleItems.map((item, index) => (
                    <React.Fragment key={index}>
                        {renderItem(item)}
                    </React.Fragment>
                ))}
            </Grid>
            {hasMore && (
                <div className="text-center py-6">
                    <Button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        variant="secondary"
                        data-testid="show-more-button"
                    >
                        Show More ({items.length - visibleCount} remaining)
                    </Button>
                </div>
            )}
        </>
    );
}
