import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { SECTIONS, SectionConfig } from "@/shared/lib/navigation";
import { useActiveSection } from "@/hooks/useActiveSection";
import { HiHome, HiUser, HiFolder, HiMail, HiPlusSm } from "react-icons/hi";

// Icon mapping for section navigation items defined in SECTIONS config
const iconMap: Record<SectionConfig['icon'], React.ComponentType<{ className?: string }>> = {
    home: HiHome,
    user: HiUser,
    folder: HiFolder,
    mail: HiMail,
};

// HiPlusSm is used directly for "New Story" link as it's not part of SECTIONS config
const NewStoryIcon = HiPlusSm;

export default function TopNav() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const activeSection = useActiveSection();

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <nav className="nav" data-testid="top-nav">
            <div className="nav__container">
                <div className="flex space-x-4">
                    {/* Desktop Navigation - Section Links */}
                    <div className="nav__links">
                        {SECTIONS.map((section) => {
                            const Icon = iconMap[section.icon];
                            const isActive = activeSection === section.id;
                            return (
                                <Link
                                    key={section.id}
                                    href={section.path}
                                    className={`nav__link ${isActive ? 'nav__link--active' : ''}`}
                                    data-testid={`nav-${section.id}-link`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className="nav__link-icon" aria-hidden="true" />
                                    <span>{section.label}</span>
                                </Link>
                            );
                        })}
                        {session?.user?.role === 'admin' && (
                            <Link href="/editor" className="nav__link" data-testid="nav-new-story-link">
                                <NewStoryIcon className="nav__link-icon" aria-hidden="true" />
                                <span>New Story</span>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="nav__mobile-toggle"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle mobile menu"
                        data-testid="mobile-menu-toggle"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center space-x-4">
                    {session ? (
                        <div className="flex items-center space-x-4">
                            <span className="hidden md:inline text-text-primary" data-testid="user-welcome">Welcome, {session.user?.name || "User"}!</span>
                            <button
                                onClick={() => signOut()}
                                className="btn btn--secondary"
                                data-testid="logout-button"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => signIn("google")}
                            className="btn btn--primary"
                            data-testid="signin-button"
                        >
                            Sign in
                        </button>
                    )}
                    <ThemeToggle />
                </div>
            </div>

            {/* Mobile Menu - Auth/Settings only (sections handled by BottomNav) */}
            {mobileMenuOpen && (
                <div className="nav__mobile-menu" data-testid="mobile-menu">
                    <div className="nav__mobile-links">
                        {session?.user?.role === 'admin' && (
                            <Link
                                href="/editor"
                                className="nav__mobile-link"
                                onClick={() => setMobileMenuOpen(false)}
                                data-testid="mobile-nav-new-story-link"
                            >
                                <NewStoryIcon className="nav__link-icon" aria-hidden="true" />
                                <span>New Story</span>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
