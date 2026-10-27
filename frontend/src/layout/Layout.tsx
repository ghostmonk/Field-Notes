import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import Footer from "./Footer";
import { SkullAvatar } from "@/components/SkullAvatar";

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-dvh transition-colors duration-300" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
            <a
                href="#main-content"
                className="skip-to-content"
                data-testid="skip-to-content"
            >
                Skip to content
            </a>
            <TopNav />
            <main
                id="main-content"
                className="container mx-auto px-6 pt-6"
                tabIndex={-1}
            >
                {children}
            </main>
            <Footer />
            <SkullAvatar />
        </div>
    );
};

export default Layout;
