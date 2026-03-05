import { useState, useEffect } from 'react';
import apiClient from '@/shared/lib/api-client';
import { sectionsToNavItems, NavSectionItem } from '@/shared/lib/navigation';

let cachedSections: NavSectionItem[] | null = null;
let fetchPromise: Promise<NavSectionItem[]> | null = null;
let listeners: Array<() => void> = [];

export function invalidateNavCache() {
    cachedSections = null;
    fetchPromise = null;
    listeners.forEach(fn => fn());
}

function fetchNavSections(): Promise<NavSectionItem[]> {
    if (cachedSections) return Promise.resolve(cachedSections);
    if (fetchPromise) return fetchPromise;

    fetchPromise = apiClient.sections.navigation()
        .then((response: { items: import('@/shared/types/api').Section[] }) => {
            const items = sectionsToNavItems(response.items);
            cachedSections = items;
            return cachedSections;
        })
        .catch(() => {
            return cachedSections ?? [];
        })
        .finally(() => {
            fetchPromise = null;
        });

    return fetchPromise;
}

export function useNavSections(): NavSectionItem[] {
    const [sections, setSections] = useState<NavSectionItem[]>(cachedSections || []);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const listener = () => setVersion((v: number) => v + 1);
        listeners.push(listener);
        return () => { listeners = listeners.filter(l => l !== listener); };
    }, []);

    useEffect(() => {
        fetchNavSections().then(setSections);
    }, [version]);

    return sections;
}
