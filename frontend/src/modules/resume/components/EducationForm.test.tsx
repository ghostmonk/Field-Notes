import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EducationForm } from './EducationForm';
import { Education } from '@/shared/types/api';

afterEach(cleanup);

const mockItems: Education[] = [
  {
    institution: 'MIT',
    degree: 'BS Computer Science',
    field_of_study: 'Computer Science',
    start_date: '2016-09',
    end_date: '2020-05',
    description: 'Studied CS',
  },
];

describe('EducationForm', () => {
  const defaultProps = {
    items: mockItems,
    onChange: vi.fn(),
  };

  it('renders education entries', () => {
    render(<EducationForm {...defaultProps} />);
    expect(screen.getByDisplayValue('MIT')).toBeDefined();
    expect(screen.getByDisplayValue('BS Computer Science')).toBeDefined();
  });

  it('shows institution and degree fields', () => {
    render(<EducationForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('Institution')).toBeDefined();
    expect(screen.getByPlaceholderText('Degree')).toBeDefined();
  });

  it('has add education button', () => {
    render(<EducationForm {...defaultProps} />);
    expect(screen.getByText('+ Add')).toBeDefined();
  });

  it('calls onChange when add button is clicked', () => {
    const onChange = vi.fn();
    render(<EducationForm {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });

  it('shows remove button for each entry', () => {
    render(<EducationForm {...defaultProps} />);
    expect(screen.getByText('Remove')).toBeDefined();
  });
});
