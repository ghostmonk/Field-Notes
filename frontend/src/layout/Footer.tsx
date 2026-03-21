import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getSiteConfig } from '@/config';
import { useNavSections } from '@/hooks/useNavSections';
import { useActiveSection } from '@/hooks/useActiveSection';
import { iconMap } from '@/shared/lib/navIcons';
import { HiPlusSm, HiCog, HiSearch, HiDocumentText } from 'react-icons/hi';
import { FaGithub, FaLinkedinIn, FaInstagram, FaXTwitter, FaTiktok, FaYoutube, FaSpotify } from 'react-icons/fa6';
import GhostmonkLogo from '@/components/GhostmonkLogo';

const socialLinks = [
    { key: 'github', label: 'GitHub', Icon: FaGithub },
    { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedinIn },
    { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
    { key: 'x', label: 'X', Icon: FaXTwitter },
    { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
    { key: 'youtube', label: 'YouTube', Icon: FaYoutube },
    { key: 'spotify', label: 'Spotify', Icon: FaSpotify },
] as const;

const config = getSiteConfig();

const Footer: React.FC = () => {
    const copyright = config.site.copyright.replace('{year}', String(new Date().getFullYear()));
    const { data: session } = useSession();
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const activeSectionId = sections.find(s => s.slug === activeSlug)?.id;

    return (
        <footer className="site-footer" data-testid="site-footer">
            <div className="site-footer__brand">
                <div className="site-footer__divider">
                    <GhostmonkLogo height={40} />
                </div>
            </div>
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
                        <li>
                            <Link href="/search" className="site-footer__link" data-testid="footer-search-link">
                                <HiSearch className="site-footer__link-icon" aria-hidden="true" />
                                Search
                            </Link>
                        </li>
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
                            <li>
                                <Link href="/resume" className="site-footer__link">
                                    <HiDocumentText className="site-footer__link-icon" aria-hidden="true" />
                                    Resume
                                </Link>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Socials column */}
                {config.socials && (
                    <div className="site-footer__column">
                        <h3 className="site-footer__heading">Social</h3>
                        <ul className="site-footer__list">
                            {socialLinks.map(({ key, label, Icon }) => {
                                const url = config.socials?.[key];
                                if (!url) return null;
                                return (
                                    <li key={key}>
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="site-footer__link">
                                            <Icon className="site-footer__link-icon" aria-hidden="true" />
                                            {label}
                                        </a>
                                    </li>
                                );
                            })}
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
                            <li>
                                <Link href="/admin/resume" className="site-footer__link" data-testid="footer-resume-builder-link">
                                    <HiDocumentText className="site-footer__link-icon" aria-hidden="true" />
                                    Resume Builder
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
