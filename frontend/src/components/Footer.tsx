import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className="fixed left-0 right-0 bottom-0 py-2 px-4 text-xs z-[60]"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                borderTop: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-secondary)'
            }}
        >
            <div className="container mx-auto flex justify-between items-center">
                <span>&copy; {currentYear} Ghostmonk</span>
                <div className="flex gap-4">
                    <Link href="/privacy" className="hover:underline">
                        Privacy
                    </Link>
                    <Link href="/terms" className="hover:underline">
                        Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
