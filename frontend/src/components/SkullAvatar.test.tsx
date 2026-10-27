import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { SkullAvatar } from './SkullAvatar';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    cleanup();
});

describe('SkullAvatar', () => {
    it('renders the skull SVG', () => {
        render(<SkullAvatar />);
        expect(screen.getByTestId('skull-avatar')).toBeInTheDocument();
        expect(screen.getByTestId('eye-left')).toBeInTheDocument();
        expect(screen.getByTestId('eye-right')).toBeInTheDocument();
    });

    it('shows initial speech phrase', () => {
        render(<SkullAvatar />);
        expect(screen.getByTestId('skull-avatar-speech')).toHaveTextContent('Hey. Welcome to my corner.');
    });

    it('shows speech bubble after 3.2s delay', () => {
        render(<SkullAvatar />);
        const container = screen.getByTestId('skull-avatar');
        expect(container.className).not.toContain('speaking');

        act(() => { vi.advanceTimersByTime(3200); });
        expect(container.className).toContain('speaking');
    });

    it('hides speech bubble after 4s', () => {
        render(<SkullAvatar />);
        act(() => { vi.advanceTimersByTime(3200); });
        expect(screen.getByTestId('skull-avatar').className).toContain('speaking');

        act(() => { vi.advanceTimersByTime(4000); });
        expect(screen.getByTestId('skull-avatar').className).not.toContain('speaking');
    });

    it('cycles phrase on click', () => {
        render(<SkullAvatar />);
        const container = screen.getByTestId('skull-avatar');
        fireEvent.click(container);
        expect(screen.getByTestId('skull-avatar-speech')).toHaveTextContent('Scroll around. I\'ll be here.');
    });

    it('wraps around phrases', () => {
        render(<SkullAvatar />);
        const container = screen.getByTestId('skull-avatar');
        for (let i = 0; i < 6; i++) {
            fireEvent.click(container);
        }
        expect(screen.getByTestId('skull-avatar-speech')).toHaveTextContent('Hey. Welcome to my corner.');
    });

    it('has eye elements with correct initial position', () => {
        render(<SkullAvatar />);
        const eyeL = screen.getByTestId('eye-left');
        const eyeR = screen.getByTestId('eye-right');
        expect(eyeL.getAttribute('cx')).toBe('46');
        expect(eyeR.getAttribute('cx')).toBe('74');
    });
});
