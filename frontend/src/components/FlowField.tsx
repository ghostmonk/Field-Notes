import { useEffect, useRef, useCallback } from 'react';

interface FlowFieldProps {
    particleCount?: number;
    noiseScale?: number;
    maxSpeed?: number;
    fadeAlpha?: number;
    flockRadius?: number;
    separationRadius?: number;
    alignWeight?: number;
    cohesionWeight?: number;
    separationWeight?: number;
    noiseWeight?: number;
    timeStep?: number;
    noiseOctaves?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const DEFAULTS = {
    particleCount: 4000,
    noiseScale: 0.004,
    maxSpeed: 0.55,
    fadeAlpha: 0.09,
    flockRadius: 80,
    separationRadius: 12,
    alignWeight: 0.2,
    cohesionWeight: 0.015,
    separationWeight: 0.15,
    noiseWeight: 0.5,
    timeStep: 0.0006,
    noiseOctaves: 5,
};

// Perlin noise implementation
const perlinGrad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

function buildPermTable(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    const perm = new Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    return perm;
}

function dot3(g: number[], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
}

function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

function createNoise3D(perm: number[]) {
    return function noise3d(x: number, y: number, z: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const zf = z - Math.floor(z);
        const u = fade(xf);
        const v = fade(yf);
        const w = fade(zf);

        const A  = perm[X] + Y;
        const AA = perm[A] + Z;
        const AB = perm[A + 1] + Z;
        const B  = perm[X + 1] + Y;
        const BA = perm[B] + Z;
        const BB = perm[B + 1] + Z;

        return lerp(
            lerp(
                lerp(dot3(perlinGrad3[perm[AA] % 12], xf, yf, zf),
                     dot3(perlinGrad3[perm[BA] % 12], xf - 1, yf, zf), u),
                lerp(dot3(perlinGrad3[perm[AB] % 12], xf, yf - 1, zf),
                     dot3(perlinGrad3[perm[BB] % 12], xf - 1, yf - 1, zf), u),
                v),
            lerp(
                lerp(dot3(perlinGrad3[perm[AA + 1] % 12], xf, yf, zf - 1),
                     dot3(perlinGrad3[perm[BA + 1] % 12], xf - 1, yf, zf - 1), u),
                lerp(dot3(perlinGrad3[perm[AB + 1] % 12], xf, yf - 1, zf - 1),
                     dot3(perlinGrad3[perm[BB + 1] % 12], xf - 1, yf - 1, zf - 1), u),
                v),
            w);
    };
}

function fbm(noise: (x: number, y: number, z: number) => number, x: number, y: number, z: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        value += noise(x * frequency, y * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return value / maxValue;
}

// Spatial hash for O(n) neighbor lookups
class SpatialHash {
    private cellSize: number;
    private cells: Map<number, number[]>;
    private width: number;

    constructor(cellSize: number, canvasWidth: number) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.width = Math.ceil(canvasWidth / cellSize) + 1;
    }

    clear(): void {
        this.cells.clear();
    }

    key(x: number, y: number): number {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return cy * this.width + cx;
    }

    insert(index: number, x: number, y: number): void {
        const k = this.key(x, y);
        const cell = this.cells.get(k);
        if (cell) {
            cell.push(index);
        } else {
            this.cells.set(k, [index]);
        }
    }

    query(x: number, y: number, radius: number): number[] {
        const result: number[] = [];
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);

        for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
                const cell = this.cells.get(cy * this.width + cx);
                if (cell) {
                    for (const idx of cell) {
                        result.push(idx);
                    }
                }
            }
        }
        return result;
    }
}

function isDarkMode(): boolean {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark') ||
        !document.documentElement.classList.contains('light');
}

export function FlowField(props: FlowFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);

    const config = { ...DEFAULTS, ...props };

    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = window.innerWidth < 768;
        const count = prefersReduced ? 0 : (isMobile ? Math.floor(config.particleCount / 2) : config.particleCount);

        handleResize();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const perm = buildPermTable();
        const noise = createNoise3D(perm);

        const w = window.innerWidth;
        const h = window.innerHeight;

        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
            });
        }

        const spatialHash = new SpatialHash(config.flockRadius, w);
        let time = 0;

        if (prefersReduced) {
            const dark = isDarkMode();
            ctx.fillStyle = dark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(5, 150, 105, 0.3)';
            const staticCount = Math.floor(config.particleCount / 4);
            for (let i = 0; i < staticCount; i++) {
                ctx.fillRect(
                    Math.random() * w,
                    Math.random() * h,
                    1, 1,
                );
            }
            return;
        }

        function animate() {
            const dark = isDarkMode();
            const fadeColor = dark ? `rgba(10, 10, 12, ${config.fadeAlpha})` : `rgba(240, 237, 232, ${config.fadeAlpha})`;
            const particleColor = dark ? 'rgba(52, 211, 153, 0.4)' : 'rgba(5, 150, 105, 0.35)';

            ctx!.fillStyle = fadeColor;
            ctx!.fillRect(0, 0, w, h);
            ctx!.fillStyle = particleColor;

            spatialHash.clear();
            for (let i = 0; i < particles.length; i++) {
                spatialHash.insert(i, particles[i].x, particles[i].y);
            }

            time += config.timeStep;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                const angle = fbm(noise, p.x * config.noiseScale, p.y * config.noiseScale, time, config.noiseOctaves) * Math.PI * 4;
                const noiseVx = Math.cos(angle) * config.noiseWeight;
                const noiseVy = Math.sin(angle) * config.noiseWeight;

                let avgVx = 0, avgVy = 0, avgX = 0, avgY = 0;
                let sepX = 0, sepY = 0;
                let alignCount = 0, sepCount = 0;

                const neighbors = spatialHash.query(p.x, p.y, config.flockRadius);
                for (const j of neighbors) {
                    if (j === i) continue;
                    const other = particles[j];
                    const dx = other.x - p.x;
                    const dy = other.y - p.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < config.flockRadius * config.flockRadius && distSq > 0) {
                        avgVx += other.vx;
                        avgVy += other.vy;
                        avgX += other.x;
                        avgY += other.y;
                        alignCount++;

                        if (distSq < config.separationRadius * config.separationRadius) {
                            const dist = Math.sqrt(distSq);
                            sepX -= dx / dist;
                            sepY -= dy / dist;
                            sepCount++;
                        }
                    }
                }

                let flockVx = 0, flockVy = 0;
                if (alignCount > 0) {
                    flockVx += (avgVx / alignCount - p.vx) * config.alignWeight;
                    flockVy += (avgVy / alignCount - p.vy) * config.alignWeight;
                    flockVx += (avgX / alignCount - p.x) * config.cohesionWeight;
                    flockVy += (avgY / alignCount - p.y) * config.cohesionWeight;
                }
                if (sepCount > 0) {
                    flockVx += (sepX / sepCount) * config.separationWeight;
                    flockVy += (sepY / sepCount) * config.separationWeight;
                }

                p.vx += noiseVx + flockVx;
                p.vy += noiseVy + flockVy;

                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > config.maxSpeed) {
                    p.vx = (p.vx / speed) * config.maxSpeed;
                    p.vy = (p.vy / speed) * config.maxSpeed;
                }

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x += w;
                if (p.x > w) p.x -= w;
                if (p.y < 0) p.y += h;
                if (p.y > h) p.y -= h;

                ctx!.fillRect(p.x, p.y, 1, 1);
            }

            animFrameRef.current = requestAnimationFrame(animate);
        }

        animFrameRef.current = requestAnimationFrame(animate);

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [config.particleCount, config.noiseScale, config.maxSpeed, config.fadeAlpha, config.flockRadius, config.separationRadius, config.alignWeight, config.cohesionWeight, config.separationWeight, config.noiseWeight, config.timeStep, config.noiseOctaves, handleResize]);

    return (
        <canvas
            ref={canvasRef}
            data-testid="flow-field"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: -2,
                pointerEvents: 'none',
            }}
        />
    );
}

export default FlowField;
