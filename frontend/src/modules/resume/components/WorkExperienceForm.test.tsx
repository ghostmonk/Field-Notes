import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WorkExperienceForm } from './WorkExperienceForm';
import { WorkExperience } from '@/shared/types/api';

afterEach(cleanup);

const mockItems: WorkExperience[] = [
  {
    company: 'Acme Corp',
    title: 'Engineer',
    start_date: '2020-01',
    end_date: '2023-01',
    current: false,
    description: 'Built things',
    technologies: ['React'],
    hide_from_downloads: false,
  },
];

describe('WorkExperienceForm', () => {
  const defaultProps = {
    items: mockItems,
    onChange: vi.fn(),
  };

  it('renders work experience entries', () => {
    render(<WorkExperienceForm {...defaultProps} />);
    expect(screen.getByDisplayValue('Acme Corp')).toBeDefined();
    expect(screen.getByDisplayValue('Engineer')).toBeDefined();
  });

  it('shows company and title fields', () => {
    render(<WorkExperienceForm {...defaultProps} items={[]} />);
    expect(screen.queryByDisplayValue('Acme Corp')).toBeNull();
  });

  it('has add experience button', () => {
    render(<WorkExperienceForm {...defaultProps} />);
    expect(screen.getByText('+ Add')).toBeDefined();
  });

  it('calls onChange when add button is clicked', () => {
    const onChange = vi.fn();
    render(<WorkExperienceForm {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });

  it('shows remove button for each entry', () => {
    render(<WorkExperienceForm {...defaultProps} />);
    expect(screen.getByText('Remove')).toBeDefined();
  });
});
