import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useSession, signIn, signOut } from "next-auth/react";
import { useNavSections } from "@/hooks/useNavSections";
import { useActiveSection } from "@/hooks/useActiveSection";
import { iconMap } from "@/shared/lib/navIcons";
import { HiPlusSm, HiCog } from "react-icons/hi";
import { getSiteConfig } from "@/config";

const NewStoryIcon = HiPlusSm;
// Safe at module scope — getSiteConfig reads a static JSON import, no runtime side effects
const config = getSiteConfig();

export default function TopNav() {
    const { data: session } = useSession();
    const sections = useNavSections();
    const activeSlug = useActiveSection(sections);
    const activeSectionId = sections.find(s => s.slug === activeSlug)?.id;

    return (
        <nav className="nav" data-testid="top-nav">
            <div className="nav__container">
                <div className="flex items-center space-x-4">
                    <Link href="/" data-testid="nav-home-link" className="nav__link nav__link--home">
                        {config.site.title}
                    </Link>
                    {/* Desktop Navigation - Section Links */}
                    <div className="nav__links">
                        {sections.map((section) => {
                            const Icon = iconMap[section.icon];
                            const isActive = activeSlug === section.slug;
                            return (
                                <Link
                                    key={section.slug}
                                    href={section.path}
                                    className={`nav__link ${isActive ? 'nav__link--active' : ''}`}
                                    data-testid={`nav-${section.slug}-link`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className="nav__link-icon" aria-hidden="true" />
                                    <span>{section.label}</span>
                                </Link>
                            );
                        })}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link
                                    href={activeSectionId ? `/editor?section_id=${activeSectionId}` : '/editor'}
                                    className="nav__link"
                                    data-testid="nav-new-content-link"
                                >
                                    <NewStoryIcon className="nav__link-icon" aria-hidden="true" />
                                    <span>New</span>
                                </Link>
                                <Link href="/admin/sections" className="nav__link" data-testid="nav-sections-link">
                                    <HiCog className="nav__link-icon" aria-hidden="true" />
                                    <span>Sections</span>
                                </Link>
                            </>
                        )}
                    </div>

                </div>

                <div className="flex items-center space-x-4">
                    {session ? (
                        <button
                            onClick={() => signOut()}
                            className="btn btn--secondary"
                            data-testid="logout-button"
                        >
                            Logout
                        </button>
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

        </nav>
    );
}
