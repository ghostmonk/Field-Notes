import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getSiteConfig } from '@/config';
import { useNavSections } from '@/hooks/useNavSections';
import { useActiveSection } from '@/hooks/useActiveSection';
import { iconMap } from '@/shared/lib/navIcons';
import { HiPlusSm, HiCog } from 'react-icons/hi';

const config = getSiteConfig();

const Footer: React.FC = () => {
    const copyright = config.site.copyright.replace('{year}', String(new Date().getFullYear()));
    const { data: session } = useSession();
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const activeSectionId = sections.find(s => s.slug === activeSlug)?.id;

    return (
        <footer className="site-footer" data-testid="site-footer">
            <div className="site-footer__grid">
                {/* Sections column */}
                <div className="site-footer__column">
                    <h3 className="site-footer__heading">Sections</h3>
                    <ul className="site-footer__list">
                        {sections.map((section) => {
                            const Icon = iconMap[section.icon];
                            return (
                                <li key={section.slug}>
                                    <Link href={section.path} className="site-footer__link" data-testid={`footer-${section.slug}-link`}>
                                        <Icon className="site-footer__link-icon" aria-hidden="true" />
                                        {section.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Utility links column */}
                {config.footer.links.length > 0 && (
                    <div className="site-footer__column">
                        <h3 className="site-footer__heading">Links</h3>
                        <ul className="site-footer__list">
                            {config.footer.links.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="site-footer__link">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Admin column */}
                {session?.user?.role === 'admin' && (
                    <div className="site-footer__column">
                        <h3 className="site-footer__heading">Admin</h3>
                        <ul className="site-footer__list">
                            <li>
                                <Link
                                    href={activeSectionId ? `/editor?section_id=${activeSectionId}` : '/editor'}
                                    className="site-footer__link"
                                    data-testid="footer-new-content-link"
                                >
                                    <HiPlusSm className="site-footer__link-icon" aria-hidden="true" />
                                    New
                                </Link>
                            </li>
                            <li>
                                <Link href="/admin/sections" className="site-footer__link" data-testid="footer-sections-link">
                                    <HiCog className="site-footer__link-icon" aria-hidden="true" />
                                    Sections
                                </Link>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Copyright bar */}
            <div className="site-footer__copyright">
                <span>{copyright}</span>
            </div>
        </footer>
    );
};

export default Footer;
