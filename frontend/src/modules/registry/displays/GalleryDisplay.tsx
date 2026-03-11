import React from 'react';
import type { GalleryDisplayProps } from '../types';

export function GalleryDisplay<T>({ items, renderItem }: GalleryDisplayProps<T>) {
    return (
        <div className="gallery-landing" data-testid="gallery-display">
            {items.map((item, index) => (
                <div key={index} className="gallery-landing__item">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}
