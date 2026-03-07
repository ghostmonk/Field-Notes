import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

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
                style={{ paddingBottom: 'var(--layout-bottom-offset)' }}
                tabIndex={-1}
            >
                {children}
            </main>
            <Footer />
            <BottomNav />
        </div>
    );
};

export default Layout;
