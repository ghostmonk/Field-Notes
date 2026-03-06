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
            <TopNav />
            <main className="container mx-auto px-6 pt-6 pb-bottom-nav">
                {children}
            </main>
            <Footer />
            <BottomNav />
        </div>
    );
};

export default Layout;
