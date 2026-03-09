import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { getSiteConfig } from "@/config";
import HamburgerMenu from "./HamburgerMenu";

const config = getSiteConfig();

export default function TopNav() {
    const { data: session } = useSession();

    return (
        <nav className="nav" data-testid="top-nav">
            <div className="nav__container">
                <HamburgerMenu />
                <Link href="/" data-testid="nav-home-link" className="nav__link--home">
                    {config.site.title}
                </Link>
                <div className="flex items-center">
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
                </div>
            </div>
        </nav>
    );
}
