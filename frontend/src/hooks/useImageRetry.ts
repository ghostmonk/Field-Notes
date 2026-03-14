import { type SyntheticEvent, useRef, useCallback } from 'react';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

export function useImageRetry(): {
    handleError: (e: SyntheticEvent<HTMLImageElement>) => void;
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
        retryCountsRef.current.clear();
    }, []);

    const handleError = useCallback(
        (e: SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            const originalSrc =
                img.dataset.retrySrc || img.src.replace(/[?&]_retry=\d+/, '');
            img.dataset.retrySrc = originalSrc;

            const count = retryCountsRef.current.get(originalSrc) || 0;

            if (count >= MAX_RETRIES) {
                img.dataset.loaded = 'true';
                return;
            }

            const nextCount = count + 1;
            retryCountsRef.current.set(originalSrc, nextCount);

            // Clear any pending timeout for this src before scheduling new one
            const existing = timeoutIdsRef.current.get(originalSrc);
            if (existing) clearTimeout(existing);

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
