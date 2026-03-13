import { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoItem } from '@/shared/types/api';

interface Props {
    photos: PhotoItem[];
    initialIndex: number;
    onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

type SlideDirection = 'left' | 'right' | null;

function preloadImage(photo: PhotoItem): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        if (photo.srcset) img.srcset = photo.srcset;
        img.sizes = '90vw';
        img.src = photo.url;
    });
}

export function PhotoViewer({ photos, initialIndex, onClose }: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showCaptions, setShowCaptions] = useState(true);
    const [direction, setDirection] = useState<SlideDirection>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [nextImageReady, setNextImageReady] = useState(false);
    const photo = photos[currentIndex];
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const preloadedUrls = useRef(new Set<string>());

    // Preload adjacent images whenever currentIndex changes
    useEffect(() => {
        const nextIdx = (currentIndex + 1) % photos.length;
        const prevIdx = (currentIndex - 1 + photos.length) % photos.length;
        [nextIdx, prevIdx].forEach((idx) => {
            const p = photos[idx];
            if (p && !preloadedUrls.current.has(p.url)) {
                preloadedUrls.current.add(p.url);
                preloadImage(p);
            }
        });
    }, [currentIndex, photos]);

    const navigate = useCallback((dir: 'left' | 'right') => {
        if (isAnimating) return;
        const targetIdx = dir === 'left'
            ? (currentIndex + 1) % photos.length
            : (currentIndex - 1 + photos.length) % photos.length;
        const targetPhoto = photos[targetIdx];

        if (preloadedUrls.current.has(targetPhoto.url)) {
            setNextImageReady(true);
            setDirection(dir);
            setIsAnimating(true);
        } else {
            // Image not preloaded — start preload, show shimmer, animate immediately
            setNextImageReady(false);
            setDirection(dir);
            setIsAnimating(true);
            preloadedUrls.current.add(targetPhoto.url);
            preloadImage(targetPhoto).then(() => setNextImageReady(true));
        }
    }, [isAnimating, currentIndex, photos]);

    const goNext = useCallback(() => navigate('left'), [navigate]);
    const goPrev = useCallback(() => navigate('right'), [navigate]);

    const handleAnimationEnd = useCallback(() => {
        setCurrentIndex((i) => {
            if (direction === 'left') return (i + 1) % photos.length;
            if (direction === 'right') return (i - 1 + photos.length) % photos.length;
            return i;
        });
        setDirection(null);
        setIsAnimating(false);
        setNextImageReady(false);
    }, [direction, photos.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose();
        };

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX.current;
            const deltaY = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                if (deltaX < 0) goNext();
                else goPrev();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
            document.body.style.overflow = '';
        };
    }, [goNext, goPrev, onClose]);

    const nextIndex = direction === 'left'
        ? (currentIndex + 1) % photos.length
        : direction === 'right'
            ? (currentIndex - 1 + photos.length) % photos.length
            : null;
    const nextPhoto = nextIndex !== null ? photos[nextIndex] : null;

    return (
        <div
            className="photo-viewer"
            data-testid="photo-viewer"
            onClick={onClose}
            role="dialog"
            aria-label="Photo viewer"
            aria-modal="true"
        >
            <div className="photo-viewer__stage" onClick={(e) => e.stopPropagation()}>
                <div
                    className={`photo-viewer__slide ${
                        direction === 'left' ? 'photo-viewer__slide--exit-left' :
                        direction === 'right' ? 'photo-viewer__slide--exit-right' : ''
                    }`}
                    onAnimationEnd={handleAnimationEnd}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        key={photo.url}
                        src={photo.url}
                        srcSet={photo.srcset || undefined}
                        sizes="90vw"
                        alt={photo.caption || ''}
                        className="photo-viewer__image"
                        data-no-zoom="true"
                        fetchPriority="high"
                    />
                </div>

                {nextPhoto && (
                    <div
                        className={`photo-viewer__slide ${
                            direction === 'left' ? 'photo-viewer__slide--enter-right' :
                            direction === 'right' ? 'photo-viewer__slide--enter-left' : ''
                        }`}
                    >
                        {!nextImageReady && (
                            <div
                                className="photo-viewer__shimmer"
                                style={{ aspectRatio: `${nextPhoto.width} / ${nextPhoto.height}` }}
                            />
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            key={nextPhoto.url}
                            src={nextPhoto.url}
                            srcSet={nextPhoto.srcset || undefined}
                            sizes="90vw"
                            alt={nextPhoto.caption || ''}
                            className={`photo-viewer__image ${!nextImageReady ? 'photo-viewer__image--loading' : ''}`}
                            data-no-zoom="true"
                            onLoad={() => setNextImageReady(true)}
                        />
                    </div>
                )}
            </div>

            {showCaptions && photo.caption && !isAnimating && (
                <p className="photo-viewer__caption" onClick={(e) => e.stopPropagation()}>
                    {photo.caption}
                </p>
            )}

            <div className="photo-viewer__counter" onClick={(e) => e.stopPropagation()}>
                {currentIndex + 1} / {photos.length}
            </div>

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

            <button
                className="photo-viewer__close"
                onClick={onClose}
                aria-label="Close viewer"
                autoFocus
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
