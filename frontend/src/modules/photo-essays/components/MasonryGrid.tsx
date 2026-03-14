import { useEffect } from 'react';
import { PhotoItem } from '@/shared/types/api';
import { useImageRetry } from '@/hooks/useImageRetry';

interface Props {
    photos: PhotoItem[];
    onPhotoClick: (index: number) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: Props) {
    const { handleError, cleanup } = useImageRetry();

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return (
        <div className="masonry-grid" data-testid="masonry-grid">
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
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            alt={photo.caption || ''}
                            width={photo.width}
                            height={photo.height}
                            loading="lazy"
                            decoding="async"
                            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
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
        </div>
    );
}
