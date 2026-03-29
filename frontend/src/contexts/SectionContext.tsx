import { createContext, useContext, ReactNode } from 'react';
import { Section } from '@/shared/types/api';

const SectionContext = createContext<Section | null>(null);

export function SectionProvider({ section, children }: { section: Section | null; children: ReactNode }) {
    return <SectionContext.Provider value={section}>{children}</SectionContext.Provider>;
}

export function useCurrentSection(): Section | null {
    return useContext(SectionContext);
}
