import { useRef, useCallback } from 'react';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

export function useImageRetry(): {
    handleError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    cleanup: () => void;
} {
    const retryCountsRef = useRef<Map<string, number>>(new Map());
    const timeoutIdsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map()
    );

    const cleanup = useCallback(() => {
        for (const id of timeoutIdsRef.current.values()) {
            clearTimeout(id);
        }
        timeoutIdsRef.current.clear();
    }, []);

    const handleError = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            const originalSrc =
                img.dataset.originalSrc || img.src.replace(/[?&]_retry=\d+/, '');
            img.dataset.originalSrc = originalSrc;

            const count = retryCountsRef.current.get(originalSrc) || 0;

            if (count >= MAX_RETRIES) {
                img.dataset.loaded = 'true';
                return;
            }

            const nextCount = count + 1;
            retryCountsRef.current.set(originalSrc, nextCount);

            const delay = BASE_DELAY_MS * nextCount;
            const separator = originalSrc.includes('?') ? '&' : '?';
            const timeoutId = setTimeout(() => {
                timeoutIdsRef.current.delete(originalSrc);
                img.src = `${originalSrc}${separator}_retry=${nextCount}`;
            }, delay);

            timeoutIdsRef.current.set(originalSrc, timeoutId);
        },
        []
    );

    return { handleError, cleanup };
}
