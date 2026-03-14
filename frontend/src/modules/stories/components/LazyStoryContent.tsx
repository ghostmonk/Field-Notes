import React, { useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

interface LazyStoryContentProps {
  content: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Renders story HTML content with in-place image enhancement.
 * Single render path — same sanitized HTML on server and client.
 * useEffect enhances existing <img> elements via setAttribute,
 * preserving in-flight image loads across hydration.
 */
export const LazyStoryContent: React.FC<LazyStoryContentProps> = ({
  content,
  className = '',
  'data-testid': testId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sanitizedContent = useMemo(
    () =>
      DOMPurify.sanitize(content, {
        ADD_ATTR: ['srcset', 'sizes', 'loading', 'width', 'height'],
      }),
    [content]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    const listenerCleanups: (() => void)[] = [];

    const images = container.querySelectorAll<HTMLImageElement>(
      'img:not([data-enhanced])'
    );

    images.forEach((img) => {
      img.setAttribute('data-enhanced', 'true');
      img.setAttribute('data-retry-src', img.src);

      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');

      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      if (width && height) {
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        if (w > 0 && h > 0 && !img.style.aspectRatio) {
          img.style.aspectRatio = `${w} / ${h}`;
        }
      }

      if (img.complete && img.naturalWidth > 0) {
        img.setAttribute('data-loaded', 'true');
        return;
      }

      let retryCount = 0;

      const onLoad = () => {
        img.setAttribute('data-loaded', 'true');
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };

      const onError = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * retryCount;
          const id = setTimeout(() => {
            if (cancelled) return;
            try {
              const originalSrc =
                img.getAttribute('data-retry-src') || img.src;
              const url = new URL(originalSrc, window.location.origin);
              url.searchParams.set('_retry', String(retryCount));
              img.addEventListener('load', onLoad);
              img.addEventListener('error', onError);
              img.src = url.toString();
            } catch {
              img.setAttribute('data-loaded', 'true');
            }
          }, delay);
          timeoutIds.push(id);
        } else {
          img.setAttribute('data-loaded', 'true');
        }
      };

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      listenerCleanups.push(() => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      });
    });

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => clearTimeout(id));
      listenerCleanups.forEach((fn) => fn());
    };
  }, [sanitizedContent]);

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      data-testid={testId}
    />
  );
};

export default LazyStoryContent;
