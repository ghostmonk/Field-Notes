import React from 'react';
import { PhotoItem } from '@/shared/types/api';

interface Props {
    photos: PhotoItem[];
    onPhotoClick: (index: number) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: Props) {
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
                        <img
                            src={photo.url}
                            srcSet={photo.srcset || undefined}
                            alt={photo.caption || ''}
                            width={photo.width}
                            height={photo.height}
                            loading="lazy"
                            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                            className="masonry-grid__image"
                            data-no-zoom="true"
                            onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                            onError={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                        />
                        {photo.caption && (
                            <span className="masonry-grid__caption">{photo.caption}</span>
                        )}
                    </button>
                ))}
        </div>
    );
}
