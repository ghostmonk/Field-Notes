import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Ruler } from './Ruler';

afterEach(cleanup);

describe('Ruler', () => {
    it('renders the ruler container', () => {
        Object.defineProperty(document.body, 'scrollHeight', { value: 1000, configurable: true });
        render(<Ruler />);
        expect(screen.getByTestId('ruler')).toBeInTheDocument();
    });

    it('is marked aria-hidden', () => {
        Object.defineProperty(document.body, 'scrollHeight', { value: 1000, configurable: true });
        render(<Ruler />);
        expect(screen.getByTestId('ruler')).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders SVG ticks', () => {
        Object.defineProperty(document.body, 'scrollHeight', { value: 800, configurable: true });
        render(<Ruler />);
        const svg = screen.getByTestId('ruler').querySelector('svg');
        expect(svg).not.toBeNull();
        const lines = svg!.querySelectorAll('line');
        expect(lines.length).toBeGreaterThan(0);
    });

    it('renders major tick labels', () => {
        Object.defineProperty(document.body, 'scrollHeight', { value: 1000, configurable: true });
        render(<Ruler />);
        const texts = screen.getByTestId('ruler').querySelectorAll('text');
        expect(texts.length).toBeGreaterThan(0);
        expect(texts[0].textContent).toBe('400');
    });

    it('has pointer-events none', () => {
        Object.defineProperty(document.body, 'scrollHeight', { value: 500, configurable: true });
        render(<Ruler />);
        expect(screen.getByTestId('ruler').style.pointerEvents).toBe('none');
    });
});
