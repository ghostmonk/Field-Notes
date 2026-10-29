import Link from "next/link";
import HamburgerMenu from "./HamburgerMenu";
import GhostmonkLogo from "@/components/GhostmonkLogo";

export default function TopNav() {
    return (
        <nav className="nav" data-testid="top-nav">
            <div className="nav__container">
                <Link href="/" data-testid="nav-home-link" className="nav__link--home">
                    <GhostmonkLogo height={28} />
                </Link>
                <HamburgerMenu />
            </div>
        </nav>
    );
}
