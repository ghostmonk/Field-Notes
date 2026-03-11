import React, { useCallback, useEffect, useState } from 'react';
import { PhotoItem } from '@/shared/types/api';

interface Props {
    photos: PhotoItem[];
    initialIndex: number;
    onClose: () => void;
}

export function PhotoViewer({ photos, initialIndex, onClose }: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showCaptions, setShowCaptions] = useState(true);
    const photo = photos[currentIndex];

    const goNext = useCallback(() => {
        setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : i));
    }, [photos.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex((i) => (i > 0 ? i - 1 : i));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [goNext, goPrev, onClose]);

    return (
        <div
            className="photo-viewer"
            data-testid="photo-viewer"
            onClick={onClose}
            role="dialog"
            aria-label="Photo viewer"
            aria-modal="true"
        >
            <div className="photo-viewer__content" onClick={(e) => e.stopPropagation()}>
                <img
                    src={photo.url}
                    srcSet={photo.srcset || undefined}
                    alt={photo.caption || ''}
                    className="photo-viewer__image"
                />

                {showCaptions && photo.caption && (
                    <p className="photo-viewer__caption">{photo.caption}</p>
                )}

                <div className="photo-viewer__counter">
                    {currentIndex + 1} / {photos.length}
                </div>
            </div>

            {currentIndex > 0 && (
                <button
                    className="photo-viewer__nav photo-viewer__nav--prev"
                    onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                    }}
                    aria-label="Previous photo"
                >
                    &#8592;
                </button>
            )}

            {currentIndex < photos.length - 1 && (
                <button
                    className="photo-viewer__nav photo-viewer__nav--next"
                    onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                    }}
                    aria-label="Next photo"
                >
                    &#8594;
                </button>
            )}

            <button
                className="photo-viewer__close"
                onClick={onClose}
                aria-label="Close viewer"
            >
                &times;
            </button>

            <button
                className="photo-viewer__toggle-captions"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowCaptions(!showCaptions);
                }}
                aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
            >
                {showCaptions ? 'Hide captions' : 'Show captions'}
            </button>
        </div>
    );
}
