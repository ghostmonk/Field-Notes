import React from 'react';
import type { GalleryDisplayProps } from '../types';

function getItemKey<T>(item: T, index: number): string {
    if (item && typeof item === 'object' && 'id' in item && typeof (item as Record<string, unknown>).id === 'string') {
        return (item as Record<string, unknown>).id as string;
    }
    return String(index);
}

export function GalleryDisplay<T>({ items, renderItem }: GalleryDisplayProps<T>) {
    return (
        <div className="gallery-landing" data-testid="gallery-display">
            {items.map((item, index) => (
                <div key={getItemKey(item, index)} className="gallery-landing__item">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}
