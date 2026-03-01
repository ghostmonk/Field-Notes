import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { getActiveSectionSlug, NavSectionItem } from '@/shared/lib/navigation';
import { useNavSections } from './useNavSections';

export function useActiveSection(): string | null {
    const router = useRouter();
    const sections = useNavSections();
    return useMemo(() => getActiveSectionSlug(router.asPath, sections), [router.asPath, sections]);
}

export function useActiveSectionWith(sections: NavSectionItem[]): string | null {
    const router = useRouter();
    return useMemo(() => getActiveSectionSlug(router.asPath, sections), [router.asPath, sections]);
}
