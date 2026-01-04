import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { getSectionFromPath, Section } from '@/shared/lib/navigation';

export function useActiveSection(): Section {
    const router = useRouter();
    return useMemo(() => getSectionFromPath(router.pathname), [router.pathname]);
}
