import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { getNavSectionFromPath, NavSection } from '@/shared/lib/navigation';

export function useActiveSection(): NavSection {
    const router = useRouter();
    return useMemo(() => getNavSectionFromPath(router.pathname), [router.pathname]);
}
