import { useEffect, useRef, useState } from 'react';
import type { HomepageBlockProps } from '../../types';

const ROLES = [
    'Writer',
    'Photographer',
    'Engineer',
    'Reader',
    'Guitarist',
    'Bodybuilder',
    'Boxer',
    'Hiker',
];

const CYCLE_MS = 2500;

export function IdentityHero(_props: HomepageBlockProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setActiveIndex((i) => (i + 1) % ROLES.length);
        }, CYCLE_MS);
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <section className="identity-hero" data-testid="identity-hero">
            <div className="identity-hero__eyebrow">
                <span className="identity-hero__line" />
                <span>ghostmonk.com</span>
            </div>

            <h1 className="identity-hero__name">
                Nicholas <em>Hillier</em>
            </h1>

            <p className="identity-hero__sub">
                Building, writing, and photographing at the intersection of
                technology and craft.
            </p>

            <div className="identity-hero__roles" data-testid="role-ticker">
                {ROLES.map((role, i) => (
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
