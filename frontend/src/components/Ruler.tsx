import { useEffect, useState, useCallback } from 'react';

const MINOR_TICK = 20;
const MAJOR_TICK = 400;

export function Ruler() {
    const [height, setHeight] = useState(0);

    const measure = useCallback(() => {
        setHeight(document.body.scrollHeight);
    }, []);

    useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        const observer = new ResizeObserver(measure);
        observer.observe(document.body);
        return () => {
            window.removeEventListener('resize', measure);
            observer.disconnect();
        };
    }, [measure]);

    if (height === 0) return null;

    const ticks: { y: number; major: boolean }[] = [];
    for (let y = 0; y <= height; y += MINOR_TICK) {
        ticks.push({ y, major: y % MAJOR_TICK === 0 });
    }

    return (
        <div
            className="ruler"
            data-testid="ruler"
            aria-hidden="true"
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '20px',
                height: '100vh',
                zIndex: 10,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <svg
                width="20"
                height="100%"
                viewBox={`0 0 20 ${height}`}
                preserveAspectRatio="xMinYMin meet"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                {ticks.map(({ y, major }) => (
                    <g key={y}>
                        <line
                            x1={major ? 0 : 12}
                            y1={y}
                            x2={20}
                            y2={y}
                            stroke="var(--color-tick)"
                            strokeWidth={major ? 1 : 0.5}
                        />
                        {major && y > 0 && (
                            <text
                                x={2}
                                y={y - 4}
                                fill="var(--color-text-tertiary)"
                                fontSize="9"
                                fontFamily="var(--font-family-mono)"
                            >
                                {y}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}

export default Ruler;
