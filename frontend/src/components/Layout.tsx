import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const isMobile = useIsMobile();

    return (
        <div className="min-h-dvh text-foreground dark:bg-gray-900 bg-white transition-colors duration-300">
            <TopNav />
            <main className={`container mx-auto p-6 ${isMobile ? 'pb-bottom-nav' : ''}`}>
                {children}
            </main>
            <BottomNav />
        </div>
    );
};

export default Layout;
