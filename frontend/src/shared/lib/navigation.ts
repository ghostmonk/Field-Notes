import { Section } from '@/shared/types/api';

export type NavIcon = 'home' | 'user' | 'folder' | 'mail' | 'default';

const VALID_ICONS: readonly string[] = ['home', 'user', 'folder', 'mail', 'default'];

export interface NavSectionItem {
    id: string;
    slug: string;
    path: string;
    label: string;
    icon: NavIcon;
}

export function sectionToNavItem(section: Section, iconMap: Record<string, string>): NavSectionItem {
    const mapped = iconMap[section.slug];
    return {
        id: section.id,
        slug: section.slug,
        path: `/${section.slug}`,
        label: section.title,
        icon: VALID_ICONS.includes(mapped) ? (mapped as NavIcon) : 'default',
    };
}

export function sectionsToNavItems(sections: Section[], iconMap: Record<string, string>): NavSectionItem[] {
    return sections.map(s => sectionToNavItem(s, iconMap));
}

const DEFAULT_SECTION_SLUG = 'blog';

export function getActiveSectionSlug(pathname: string, sections: NavSectionItem[]): string {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (!firstSegment) return DEFAULT_SECTION_SLUG;

    return sections.find(s => s.slug === firstSegment)?.slug || DEFAULT_SECTION_SLUG;
}
