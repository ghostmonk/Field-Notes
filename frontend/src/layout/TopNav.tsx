import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import HamburgerMenu from "./HamburgerMenu";
import GhostmonkLogo from "@/components/GhostmonkLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopNav() {
    const { data: session } = useSession();

    return (
        <nav className="nav" data-testid="top-nav">
            <div className="nav__container">
                <HamburgerMenu />
                <Link href="/" data-testid="nav-home-link" className="nav__link--home">
                    <GhostmonkLogo height={42} />
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
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
                            onClick={() => process.env.NODE_ENV === 'development' ? signIn() : signIn("google")}
                            className="btn btn--primary"
                            data-testid="signin-button"
                        >
                            Sign in
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
