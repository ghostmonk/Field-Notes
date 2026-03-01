import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { getActiveSectionSlug, NavSectionItem } from '@/shared/lib/navigation';

export function useActiveSection(sections: NavSectionItem[]): string {
    const router = useRouter();
    return useMemo(() => getActiveSectionSlug(router.asPath, sections), [router.asPath, sections]);
}
