import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useNavSections } from "@/hooks/useNavSections";
import { useActiveSection } from "@/hooks/useActiveSection";
import { iconMap } from "@/shared/lib/navIcons";
import { HiCog, HiSearch } from "react-icons/hi";
import { getSiteConfig } from "@/config";
import ThemeToggle from "@/components/ThemeToggle";

const config = getSiteConfig();

export default function HamburgerMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const overlayRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hasMounted = useRef(false);

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

    // Keyboard: Escape to close, Tab/Shift+Tab focus trap
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                close();
                return;
            }
            if (e.key === "Tab" && overlayRef.current) {
                const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
                    "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, close]);

    // Focus management: move focus into overlay on open, return on close
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (isOpen) {
            const firstLink = overlayRef.current?.querySelector<HTMLElement>("a, button");
            firstLink?.focus();
        } else {
            buttonRef.current?.focus();
        }
    }, [isOpen]);

    return (
        <>
            {/* Overlay */}
            <div
                ref={overlayRef}
                id="menu-overlay"
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

                    {/* Search */}
                    <div className="menu-overlay__group">
                        <div className="menu-overlay__links">
                            <Link
                                href="/search"
                                className="menu-overlay__link"
                                data-testid="nav-search-link"
                                onClick={close}
                            >
                                <HiSearch className="menu-overlay__link-icon" aria-hidden="true" />
                                <span>Search</span>
                            </Link>
                        </div>
                    </div>

                    {/* Admin */}
                    {session?.user?.role === "admin" && (
                        <div className="menu-overlay__group">
                            <h2 className="menu-overlay__heading">Admin</h2>
                            <div className="menu-overlay__links">
                                <Link
                                    href="/admin"
                                    className="menu-overlay__link"
                                    data-testid="nav-command-center-link"
                                    onClick={close}
                                >
                                    <HiCog className="menu-overlay__link-icon" aria-hidden="true" />
                                    <span>Command Center</span>
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
                ref={buttonRef}
                className={isOpen ? "hamburger hamburger--open" : "hamburger"}
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
