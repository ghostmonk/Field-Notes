import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNavSections } from "@/hooks/useNavSections";
import { useActiveSection } from "@/hooks/useActiveSection";
import { iconMap } from "@/shared/lib/navIcons";
import { HiPlusSm, HiCog } from "react-icons/hi";
import { getSiteConfig } from "@/config";
import ThemeToggle from "@/components/ThemeToggle";

const config = getSiteConfig();

export default function HamburgerMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const activeSectionId = sections.find(s => s.slug === activeSlug)?.id;

    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
        }
        return () => { document.documentElement.style.overflow = ""; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, close]);

    return (
        <>
            {/* Overlay */}
            <div
                className={`menu-overlay ${isOpen ? "menu-overlay--open" : ""}`}
                data-testid="menu-overlay"
                aria-hidden={!isOpen}
            >
                <nav className="menu-overlay__content" role="navigation" aria-label="Main menu">
                    {/* Sections */}
                    <div className="menu-overlay__group">
                        <h2 className="menu-overlay__heading">Sections</h2>
                        <div className="menu-overlay__links">
                            {sections.map((section) => {
                                const Icon = iconMap[section.icon];
                                const isActive = activeSlug === section.slug;
                                return (
                                    <Link
                                        key={section.slug}
                                        href={section.path}
                                        className={`menu-overlay__link ${isActive ? "menu-overlay__link--active" : ""}`}
                                        data-testid={`nav-${section.slug}-link`}
                                        aria-current={isActive ? "page" : undefined}
                                        onClick={close}
                                    >
                                        <Icon className="menu-overlay__link-icon" aria-hidden="true" />
                                        <span>{section.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Admin */}
                    {session?.user?.role === "admin" && (
                        <div className="menu-overlay__group">
                            <h2 className="menu-overlay__heading">Admin</h2>
                            <div className="menu-overlay__links">
                                <Link
                                    href={activeSectionId ? `/editor?section_id=${activeSectionId}` : "/editor"}
                                    className="menu-overlay__link"
                                    data-testid="nav-new-content-link"
                                    onClick={close}
                                >
                                    <HiPlusSm className="menu-overlay__link-icon" aria-hidden="true" />
                                    <span>New</span>
                                </Link>
                                <Link
                                    href="/admin/sections"
                                    className="menu-overlay__link"
                                    data-testid="nav-sections-link"
                                    onClick={close}
                                >
                                    <HiCog className="menu-overlay__link-icon" aria-hidden="true" />
                                    <span>Sections</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Theme */}
                    <div className="menu-overlay__group">
                        <h2 className="menu-overlay__heading">Theme</h2>
                        <ThemeToggle />
                    </div>

                    {/* Utility links */}
                    {config.footer.links.length > 0 && (
                        <div className="menu-overlay__group">
                            <div className="menu-overlay__links">
                                {config.footer.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="menu-overlay__link"
                                        onClick={close}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>
            </div>

            {/* Hamburger trigger button */}
            <button
                className={`hamburger ${isOpen ? "hamburger--open" : ""}`}
                onClick={toggle}
                aria-expanded={isOpen}
                aria-controls="menu-overlay"
                aria-label={isOpen ? "Close menu" : "Open menu"}
                data-testid="hamburger-button"
            >
                <span className="hamburger__line hamburger__line--top" />
                <span className="hamburger__line hamburger__line--bottom" />
            </button>
        </>
    );
}
