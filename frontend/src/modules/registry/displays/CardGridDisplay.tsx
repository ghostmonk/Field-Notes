import React from 'react';
import type { CardGridDisplayProps } from '../types';

export function CardGridDisplay<T>({ items, renderItem }: CardGridDisplayProps<T>) {
    return (
        <div className="grid grid--responsive">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {renderItem(item)}
                </React.Fragment>
            ))}
        </div>
    );
}
