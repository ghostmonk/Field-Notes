import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SkillsForm } from './SkillsForm';

afterEach(cleanup);

describe('SkillsForm', () => {
  it('renders existing skills as badges', () => {
    const onChange = vi.fn();
    render(<SkillsForm skills={['React', 'TypeScript', 'Node.js']} onChange={onChange} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('has input for adding new skills', () => {
    const onChange = vi.fn();
    render(<SkillsForm skills={[]} onChange={onChange} />);

    expect(screen.getByPlaceholderText('Add skill...')).toBeInTheDocument();
  });

  it('calls onChange when skill removed via x button', () => {
    const onChange = vi.fn();
    render(<SkillsForm skills={['React', 'TypeScript']} onChange={onChange} />);

    const removeButtons = screen.getAllByText('x');
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['TypeScript']);
  });

  it('adds skill on Enter key', () => {
    const onChange = vi.fn();
    render(<SkillsForm skills={['React']} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Add skill...');
    fireEvent.change(input, { target: { value: 'Go' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['React', 'Go']);
  });
});
