import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 768px)');
}

export function useIsMobile(): boolean {
    return !useMediaQuery('(min-width: 768px)');
}
