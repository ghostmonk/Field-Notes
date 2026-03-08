import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { getLayoutConfig } from "@/config";

interface LayoutProps {
    children: ReactNode;
}

const layoutConfig = getLayoutConfig();

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
            {layoutConfig.navigation.desktop === 'top' && <TopNav />}
            <main
                id="main-content"
                className="container mx-auto px-6 pt-6"
                style={{ paddingBottom: 'var(--layout-bottom-offset)' }}
                tabIndex={-1}
            >
                {children}
            </main>
            <Footer />
            {layoutConfig.navigation.mobile === 'bottom' && <BottomNav />}
        </div>
    );
};

export default Layout;
