import React, { useEffect, useRef, useState, useCallback } from 'react';

const PHRASES = [
    'Hey. Welcome to my corner.',
    'Scroll around. I\'ll be here.',
    'I built this site myself.',
    'Ask me anything. (soon)',
    'Nice cursor you got there.',
    'Try hovering the roles.',
];

const EYE_L_CX = 46;
const EYE_R_CX = 74;
const EYE_CY = 50.5;
const PUPIL_RANGE = 2;

export const SkullAvatar: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const eyeLRef = useRef<SVGCircleElement>(null);
    const eyeRRef = useRef<SVGCircleElement>(null);
    const [speaking, setSpeaking] = useState(false);
    const [phraseIdx, setPhraseIdx] = useState(0);
    const speechTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSpeaking(true);
            speechTimerRef.current = setTimeout(() => setSpeaking(false), 4000);
        }, 3200);
        return () => {
            clearTimeout(timer);
            if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const avatar = containerRef.current?.querySelector('.skull-avatar__figure');
            if (!avatar) return;
            const rect = avatar.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + 40;
            const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
            const dx = Math.cos(angle) * PUPIL_RANGE;
            const dy = Math.sin(angle) * PUPIL_RANGE;
            eyeLRef.current?.setAttribute('cx', String(EYE_L_CX + dx));
            eyeLRef.current?.setAttribute('cy', String(EYE_CY + dy));
            eyeRRef.current?.setAttribute('cx', String(EYE_R_CX + dx));
            eyeRRef.current?.setAttribute('cy', String(EYE_CY + dy));
        };
        document.addEventListener('mousemove', onMouseMove);
        return () => document.removeEventListener('mousemove', onMouseMove);
    }, []);

    const handleClick = useCallback(() => {
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        setPhraseIdx((prev) => (prev + 1) % PHRASES.length);
        setSpeaking(false);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setSpeaking(true));
        });
        speechTimerRef.current = setTimeout(() => setSpeaking(false), 4000);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`skull-avatar${speaking ? ' skull-avatar--speaking' : ''}`}
            onClick={handleClick}
            data-testid="skull-avatar"
        >
            <div className="skull-avatar__speech" data-testid="skull-avatar-speech">
                {PHRASES[phraseIdx]}
            </div>
            <div className="skull-avatar__figure">
                <svg viewBox="0 0 120 160" fill="none" aria-hidden="true">
                    {/* Body / shoulders */}
                    <path d="M30 120 Q30 105 60 100 Q90 105 90 120 L90 160 L30 160Z" fill="var(--color-surface-tertiary)" stroke="var(--color-text-tertiary)" strokeWidth="1.5" />
                    {/* Neck */}
                    <rect x="50" y="88" width="20" height="14" fill="var(--color-surface-tertiary)" stroke="var(--color-text-tertiary)" strokeWidth="1.5" rx="2" />
                    <line x1="54" y1="92" x2="66" y2="92" stroke="var(--color-text-tertiary)" strokeWidth="0.5" opacity="0.3" />
                    <line x1="54" y1="96" x2="66" y2="96" stroke="var(--color-text-tertiary)" strokeWidth="0.5" opacity="0.3" />
                    {/* Skull */}
                    <path d="M32 55 C32 30 40 16 60 16 C80 16 88 30 88 55 C88 65 84 72 78 76 L78 82 L42 82 L42 76 C36 72 32 65 32 55Z" fill="var(--color-surface-tertiary)" stroke="var(--color-text-tertiary)" strokeWidth="1.5" />
                    {/* Cranium detail */}
                    <path d="M45 22 Q60 18 75 22" stroke="var(--color-text-tertiary)" strokeWidth="0.6" fill="none" opacity="0.3" />
                    {/* Temple lines */}
                    <path d="M35 45 Q37 50 36 55" stroke="var(--color-text-tertiary)" strokeWidth="0.6" fill="none" opacity="0.25" />
                    <path d="M85 45 Q83 50 84 55" stroke="var(--color-text-tertiary)" strokeWidth="0.6" fill="none" opacity="0.25" />
                    {/* Glasses */}
                    <rect x="38" y="44" width="16" height="13" rx="2.5" stroke="var(--color-brand-primary)" strokeWidth="2" fill="none" />
                    <rect x="66" y="44" width="16" height="13" rx="2.5" stroke="var(--color-brand-primary)" strokeWidth="2" fill="none" />
                    <line x1="54" y1="50" x2="66" y2="50" stroke="var(--color-brand-primary)" strokeWidth="1.5" />
                    <line x1="30" y1="49" x2="38" y2="49" stroke="var(--color-brand-primary)" strokeWidth="1.5" />
                    <line x1="82" y1="49" x2="90" y2="49" stroke="var(--color-brand-primary)" strokeWidth="1.5" />
                    {/* Eye sockets */}
                    <ellipse cx="46" cy="50.5" rx="5" ry="4.5" fill="var(--color-surface-primary)" />
                    <ellipse cx="74" cy="50.5" rx="5" ry="4.5" fill="var(--color-surface-primary)" />
                    {/* Pupils */}
                    <circle ref={eyeLRef} cx={EYE_L_CX} cy={EYE_CY} r="2.5" fill="var(--color-brand-primary)" data-testid="eye-left" />
                    <circle ref={eyeRRef} cx={EYE_R_CX} cy={EYE_CY} r="2.5" fill="var(--color-brand-primary)" data-testid="eye-right" />
                    {/* Pupil glint */}
                    <circle cx="47.5" cy="49.5" r="0.8" fill="var(--color-text-primary)" opacity="0.6" />
                    <circle cx="75.5" cy="49.5" r="0.8" fill="var(--color-text-primary)" opacity="0.6" />
                    {/* Nose */}
                    <path d="M55 63 L60 68 L65 63" stroke="var(--color-text-tertiary)" strokeWidth="1.5" fill="none" />
                    <circle cx="57" cy="65" r="1" fill="var(--color-surface-primary)" stroke="var(--color-text-tertiary)" strokeWidth="0.5" />
                    <circle cx="63" cy="65" r="1" fill="var(--color-surface-primary)" stroke="var(--color-text-tertiary)" strokeWidth="0.5" />
                    {/* Cheekbones */}
                    <path d="M35 58 Q39 62 43 58" stroke="var(--color-text-tertiary)" strokeWidth="0.7" fill="none" opacity="0.3" />
                    <path d="M77 58 Q81 62 85 58" stroke="var(--color-text-tertiary)" strokeWidth="0.7" fill="none" opacity="0.3" />
                    {/* Jaw line */}
                    <line x1="42" y1="76" x2="78" y2="76" stroke="var(--color-text-tertiary)" strokeWidth="0.5" opacity="0.4" />
                    {/* Teeth */}
                    <line x1="47" y1="76" x2="47" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="52" y1="76" x2="52" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="56" y1="76" x2="56" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="60" y1="76" x2="60" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="64" y1="76" x2="64" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="68" y1="76" x2="68" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    <line x1="73" y1="76" x2="73" y2="82" stroke="var(--color-text-tertiary)" strokeWidth="1" />
                    {/* Beard */}
                    <path d="M42 82 Q42 100 60 106 Q78 100 78 82" stroke="var(--color-text-tertiary)" strokeWidth="1.5" fill="none" />
                    <path d="M46 86 Q46 98 60 103 Q74 98 74 86" stroke="var(--color-text-tertiary)" strokeWidth="0.8" fill="none" opacity="0.35" />
                    <path d="M50 90 Q50 96 60 100 Q70 96 70 90" stroke="var(--color-text-tertiary)" strokeWidth="0.6" fill="none" opacity="0.2" />
                    <path d="M54 92 Q54 96 60 98 Q66 96 66 92" stroke="var(--color-text-tertiary)" strokeWidth="0.4" fill="none" opacity="0.15" />
                    {/* Waving arm */}
                    <g className="skull-avatar__hand-wave">
                        <path d="M90 120 Q95 110 100 95 Q102 88 98 85" stroke="var(--color-text-tertiary)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <circle cx="98" cy="84" r="3" fill="var(--color-surface-tertiary)" stroke="var(--color-text-tertiary)" strokeWidth="1.2" />
                        <line x1="96" y1="81" x2="94" y2="77" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" />
                        <line x1="98" y1="81" x2="97" y2="76" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" />
                        <line x1="100" y1="81" x2="100" y2="76" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" />
                        <line x1="101" y1="83" x2="103" y2="79" stroke="var(--color-text-tertiary)" strokeWidth="1" strokeLinecap="round" />
                    </g>
                </svg>
            </div>
        </div>
    );
};
