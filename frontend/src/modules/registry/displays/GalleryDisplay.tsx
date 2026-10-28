import type { GalleryDisplayProps } from '../types';

function getItemKey<T>(item: T, index: number): string {
    if (item && typeof item === 'object' && 'id' in item && typeof (item as Record<string, unknown>).id === 'string') {
        return (item as Record<string, unknown>).id as string;
    }
    return String(index);
}

export function GalleryDisplay<T>({ items, renderItem }: GalleryDisplayProps<T>) {
    if (items.length === 0) return <div data-testid="gallery-display" />;

    const [featured, ...remaining] = items;

    return (
        <div data-testid="gallery-display">
            <div className="gallery-featured">
                {renderItem(featured)}
            </div>

            {remaining.length > 0 && (
                <div className="gallery-masonry">
                    {remaining.map((item, index) => (
                        <div key={getItemKey(item, index)} className="gallery-masonry__item">
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
