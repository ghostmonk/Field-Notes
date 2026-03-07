import React from 'react';
import Link from 'next/link';
import { getSiteConfig } from '@/config';

const config = getSiteConfig();
const copyright = config.site.copyright.replace('{year}', String(new Date().getFullYear()));

const Footer: React.FC = () => {
    return (
        <footer
            className="fixed left-0 right-0 bottom-0 py-2 px-4 text-xs z-[55] pointer-events-none"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                borderTop: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-secondary)'
            }}
        >
            <div className="container mx-auto flex justify-between items-center">
                <span className="pointer-events-auto">{copyright}</span>
                <div className="flex gap-4">
                    {config.footer.links.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:underline pointer-events-auto">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
