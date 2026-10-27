import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FlowField } from './FlowField';

const mockMatchMedia = (reducedMotion = false) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
    }));
};

afterEach(cleanup);

describe('FlowField', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            scale: vi.fn(),
            fillStyle: '',
            fillRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders a canvas element', () => {
        render(<FlowField />);
        expect(screen.getByTestId('flow-field')).toBeInTheDocument();
        expect(screen.getByTestId('flow-field').tagName).toBe('CANVAS');
    });

    it('applies fixed positioning styles', () => {
        render(<FlowField />);
        const canvas = screen.getByTestId('flow-field');
        expect(canvas.style.position).toBe('fixed');
        expect(canvas.style.pointerEvents).toBe('none');
        expect(canvas.style.zIndex).toBe('-2');
    });

    it('respects prefers-reduced-motion', () => {
        mockMatchMedia(true);
        render(<FlowField />);
        expect(screen.getByTestId('flow-field')).toBeInTheDocument();
    });
});
