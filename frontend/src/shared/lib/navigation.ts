import { Section } from '@/shared/types/api';

export type NavIcon = 'home' | 'user' | 'folder' | 'mail' | 'default';

export interface NavSectionItem {
    slug: string;
    path: string;
    label: string;
    icon: NavIcon;
}

const SLUG_ICON_MAP: Record<string, NavIcon> = {
    blog: 'home',
    about: 'user',
    projects: 'folder',
    contact: 'mail',
};

export const FALLBACK_SECTIONS: NavSectionItem[] = [
    { slug: 'blog', path: '/', label: 'Blog', icon: 'home' },
    { slug: 'about', path: '/about', label: 'About', icon: 'user' },
    { slug: 'projects', path: '/projects', label: 'Projects', icon: 'folder' },
    { slug: 'contact', path: '/contact', label: 'Contact', icon: 'mail' },
];

export function sectionToNavItem(section: Section): NavSectionItem {
    return {
        slug: section.slug,
        path: `/${section.slug}`,
        label: section.title,
        icon: SLUG_ICON_MAP[section.slug] || 'default',
    };
}

export function sectionsToNavItems(sections: Section[]): NavSectionItem[] {
    return sections.map(sectionToNavItem);
}

export function getActiveSectionSlug(pathname: string, sections: NavSectionItem[]): string | null {
    if (pathname === '/') return 'blog';

    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (!firstSegment) return 'blog';

    const match = sections.find(s => s.slug === firstSegment);
    if (match) return match.slug;

    // Story detail pages (e.g., /blog/some-story) — check if first segment matches any section
    return sections.find(s => pathname.startsWith(s.path + '/'))?.slug || 'blog';
}
