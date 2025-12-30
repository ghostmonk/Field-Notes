import React from 'react';
import Link from 'next/link';
import { useActiveSection } from '@/hooks/useActiveSection';
import { SECTIONS, SectionConfig } from '@/lib/navigation';
import { HiHome, HiUser, HiFolder, HiMail } from 'react-icons/hi';

const iconMap: Record<SectionConfig['icon'], React.ComponentType<{ className?: string }>> = {
    home: HiHome,
    user: HiUser,
    folder: HiFolder,
    mail: HiMail,
};

interface NavItemProps {
    section: SectionConfig;
    isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ section, isActive }) => {
    const Icon = iconMap[section.icon];

    return (
        <Link
            href={section.path}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            data-testid={`bottom-nav-${section.id}`}
        >
            <Icon className="bottom-nav__icon" aria-hidden="true" />
            <span className="bottom-nav__label">{section.label}</span>
        </Link>
    );
};

const BottomNav: React.FC = () => {
    const activeSection = useActiveSection();

    return (
        <nav
            className="bottom-nav md:hidden"
            role="navigation"
            aria-label="Main navigation"
            data-testid="bottom-nav"
        >
            {SECTIONS.map((section) => (
                <NavItem
                    key={section.id}
                    section={section}
                    isActive={activeSection === section.id}
                />
            ))}
        </nav>
    );
};

export default BottomNav;
