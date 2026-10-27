import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SectionHeader } from './SectionHeader';

afterEach(cleanup);

describe('SectionHeader', () => {
    it('renders label text', () => {
        render(<SectionHeader label="Photography" />);
        expect(screen.getByText('Photography')).toBeInTheDocument();
    });

    it('renders the rule separator', () => {
        render(<SectionHeader label="Writing" />);
        const header = screen.getByTestId('section-header');
        expect(header.querySelector('.section-hdr__rule')).toBeInTheDocument();
    });

    it('renders annotation when provided', () => {
        render(<SectionHeader label="Writing" annotation="5 recent" />);
        expect(screen.getByText('5 recent')).toBeInTheDocument();
    });

    it('omits annotation when not provided', () => {
        render(<SectionHeader label="Writing" />);
        expect(screen.queryByText(/recent/)).not.toBeInTheDocument();
    });
});
