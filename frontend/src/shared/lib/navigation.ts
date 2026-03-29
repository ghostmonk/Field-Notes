import { Section } from '@/shared/types/api';
import { SectionIcon, SECTION_ICONS } from '@/shared/lib/navIcons';

const VALID_ICON_SET = new Set<string>(SECTION_ICONS);

export interface NavSectionItem {
    id: string;
    slug: string;
    path: string;
    label: string;
    icon: SectionIcon;
}

export function sectionToNavItem(section: Section): NavSectionItem {
    return {
        id: section.id,
        slug: section.slug,
        path: `/${section.path || section.slug}`,
        label: section.title,
        icon: VALID_ICON_SET.has(section.icon) ? (section.icon as SectionIcon) : 'default',
    };
}

export function sectionsToNavItems(sections: Section[]): NavSectionItem[] {
    return sections.map(sectionToNavItem);
}

const DEFAULT_SECTION_SLUG = 'blog';

export function getActiveSectionSlug(pathname: string, sections: NavSectionItem[]): string {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (!firstSegment) return DEFAULT_SECTION_SLUG;
    return sections.find(s => s.slug === firstSegment)?.slug || DEFAULT_SECTION_SLUG;
}
