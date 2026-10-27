import { useEffect, useRef, useState } from 'react';
import { getSiteConfig } from '@/config';
import type { HomepageBlockProps } from '../../types';

const config = getSiteConfig();

const DEFAULT_ROLES = ['Writer', 'Photographer', 'Engineer'];
const CYCLE_MS = 2500;

export function IdentityHero(_props: HomepageBlockProps) {
    const roles = config.hero.roles ?? DEFAULT_ROLES;
    const name = config.hero.name ?? config.site.author;
    const byline = config.hero.byline ?? config.site.tagline;

    const [activeIndex, setActiveIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setActiveIndex((i) => (i + 1) % roles.length);
        }, CYCLE_MS);
        return () => clearInterval(intervalRef.current);
    }, [roles.length]);

    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ');

    return (
        <section className="identity-hero" data-testid="identity-hero">
            <div className="identity-hero__eyebrow">
                <span className="identity-hero__line" />
                <span>ghostmonk.com</span>
            </div>

            <h1 className="identity-hero__name">
                {firstName} <em>{lastName}</em>
            </h1>

            <p className="identity-hero__sub">{byline}</p>

            <div className="identity-hero__roles" data-testid="role-ticker">
                {roles.map((role, i) => (
                    <span
                        key={role}
                        className={`identity-hero__role${i === activeIndex ? ' identity-hero__role--active' : ''}`}
                        data-testid={`role-${role.toLowerCase()}`}
                    >
                        {role}
                    </span>
                ))}
            </div>
        </section>
    );
}
