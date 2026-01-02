import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const isMobile = useIsMobile();

    return (
        <div className="min-h-dvh transition-colors duration-300" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
            <TopNav />
            <main className={`container mx-auto p-6 ${isMobile ? 'pb-bottom-nav' : 'pb-10'}`}>
                {children}
            </main>
            <Footer />
            <BottomNav />
        </div>
    );
};

export default Layout;
