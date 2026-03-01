export type NavSection = 'blog' | 'about' | 'projects' | 'contact';

export interface NavSectionConfig {
    id: NavSection;
    path: string;
    label: string;
    icon: 'home' | 'user' | 'folder' | 'mail';
}

export const SECTIONS: NavSectionConfig[] = [
    { id: 'blog', path: '/', label: 'Blog', icon: 'home' },
    { id: 'about', path: '/about', label: 'About', icon: 'user' },
    { id: 'projects', path: '/projects', label: 'Projects', icon: 'folder' },
    { id: 'contact', path: '/contact', label: 'Contact', icon: 'mail' },
];

export function getNavSectionFromPath(pathname: string): NavSection {
    if (pathname === '/') return 'blog';
    if (pathname.startsWith('/about')) return 'about';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/contact')) return 'contact';
    // Default to blog for story pages, editor, etc.
    return 'blog';
}
