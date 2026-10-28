import { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoItem } from '@/shared/types/api';
import { useImageRetry } from '@/hooks/useImageRetry';

interface Props {
    photos: PhotoItem[];
    onPhotoClick: (index: number) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: Props) {
    const { handleError, cleanup } = useImageRetry();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrolledPastStart, setScrolledPastStart] = useState(false);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setScrolledPastStart(el.scrollLeft > 40);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    return (
        <div className="masonry-grid" data-testid="masonry-grid" ref={containerRef}>
            {photos.map((photo, index) => (
                    <button
                        key={`${photo.url}-${index}`}
                        className="masonry-grid__item"
                        onClick={() => onPhotoClick(index)}
                        type="button"
                        aria-label={photo.caption || `Photo ${index + 1}`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- backend generates responsive WebP srcsets */}
                        <img
                            src={photo.url}
                            srcSet={photo.srcset || undefined}
                            sizes="auto"
                            alt={photo.caption || ''}
                            loading="lazy"
                            decoding="async"
                            className="masonry-grid__image"
                            data-no-zoom="true"
                            onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                            onError={handleError}
                        />
                        {photo.caption && (
                            <span className="masonry-grid__caption">{photo.caption}</span>
                        )}
                    </button>
                ))}
            <div className={`masonry-grid__scroll-hint ${scrolledPastStart ? 'masonry-grid__scroll-hint--hidden' : ''}`}>
                <span className="masonry-grid__scroll-hint-label">
                    {photos.length} photos
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </span>
            </div>
        </div>
    );
}
