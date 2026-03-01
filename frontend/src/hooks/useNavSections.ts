import { useState, useEffect } from 'react';
import apiClient from '@/shared/lib/api-client';
import { FALLBACK_SECTIONS, sectionsToNavItems, NavSectionItem } from '@/shared/lib/navigation';

let cachedSections: NavSectionItem[] | null = null;
let fetchPromise: Promise<NavSectionItem[]> | null = null;

function fetchNavSections(): Promise<NavSectionItem[]> {
    if (cachedSections) return Promise.resolve(cachedSections);
    if (fetchPromise) return fetchPromise;

    fetchPromise = apiClient.sections.navigation()
        .then(response => {
            const items = sectionsToNavItems(response.items);
            cachedSections = items.length > 0 ? items : FALLBACK_SECTIONS;
            return cachedSections;
        })
        .catch(() => {
            cachedSections = FALLBACK_SECTIONS;
            return cachedSections;
        })
        .finally(() => {
            fetchPromise = null;
        });

    return fetchPromise;
}

export function useNavSections(): NavSectionItem[] {
    const [sections, setSections] = useState<NavSectionItem[]>(cachedSections || FALLBACK_SECTIONS);

    useEffect(() => {
        if (cachedSections) {
            setSections(cachedSections);
            return;
        }

        fetchNavSections().then(setSections);
    }, []);

    return sections;
}
