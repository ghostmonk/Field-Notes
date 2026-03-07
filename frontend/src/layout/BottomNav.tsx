import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useNavSections } from '@/hooks/useNavSections';
import { useActiveSection } from '@/hooks/useActiveSection';
import { getSiteConfig } from '@/config';
import { NavSectionItem, NavIcon } from '@/shared/lib/navigation';
import { HiHome, HiUser, HiFolder, HiMail, HiViewGrid } from 'react-icons/hi';

const iconMap: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
    home: HiHome,
    user: HiUser,
    folder: HiFolder,
    mail: HiMail,
    default: HiViewGrid,
};

interface NavItemProps {
    section: NavSectionItem;
    isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ section, isActive }) => {
    const Icon = iconMap[section.icon];

    return (
        <Link
            href={section.path}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            data-testid={`bottom-nav-${section.slug}`}
        >
            <Icon className="bottom-nav__icon" aria-hidden="true" />
            <span className="bottom-nav__label">{section.label}</span>
        </Link>
    );
};

const BottomNav: React.FC = () => {
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const config = getSiteConfig();
    const router = useRouter();
    const isHomePage = router.pathname === '/';

    return (
        <nav
            className="bottom-nav md:hidden"
            role="navigation"
            aria-label="Main navigation"
            data-testid="bottom-nav"
        >
            <Link
                href="/"
                className={`bottom-nav__item ${isHomePage ? 'bottom-nav__item--active' : ''}`}
                aria-current={isHomePage ? 'page' : undefined}
                data-testid="bottom-nav-home"
            >
                <HiHome className="bottom-nav__icon" aria-hidden="true" />
                <span className="bottom-nav__label">{config.site.title}</span>
            </Link>
            {sections.map((section) => (
                <NavItem
                    key={section.slug}
                    section={section}
                    isActive={!isHomePage && activeSlug === section.slug}
                />
            ))}
        </nav>
    );
};

export default BottomNav;
