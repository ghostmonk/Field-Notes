import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  StoryItemSkeleton,
  StoriesListSkeleton,
  PageLoadingSkeleton,
  BackendWarmupBanner,
} from './LoadingSkeletons';

afterEach(cleanup);

describe('StoryItemSkeleton', () => {
  it('renders with data-testid="story-skeleton"', () => {
    render(<StoryItemSkeleton />);
    expect(screen.getByTestId('story-skeleton')).toBeInTheDocument();
  });
});

describe('StoriesListSkeleton', () => {
  it('renders default 3 skeletons', () => {
    render(<StoriesListSkeleton />);
    expect(screen.getAllByTestId('story-skeleton')).toHaveLength(3);
  });

  it('renders custom count', () => {
    render(<StoriesListSkeleton count={5} />);
    expect(screen.getAllByTestId('story-skeleton')).toHaveLength(5);
  });
});

describe('PageLoadingSkeleton', () => {
  it('renders default message', () => {
    render(<PageLoadingSkeleton />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<PageLoadingSkeleton message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });
});

describe('BackendWarmupBanner', () => {
  it('returns null when both isWarming and warmupFailed are false', () => {
    const { container } = render(
      <BackendWarmupBanner isWarming={false} warmupFailed={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows warming message when isWarming=true', () => {
    render(<BackendWarmupBanner isWarming={true} warmupFailed={false} />);
    expect(screen.getByText('Starting up services...')).toBeInTheDocument();
  });

  it('shows failure message when warmupFailed=true', () => {
    render(<BackendWarmupBanner isWarming={false} warmupFailed={true} />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('shows retry button when warmupFailed and onRetry provided', () => {
    const onRetry = vi.fn();
    render(
      <BackendWarmupBanner isWarming={false} warmupFailed={true} onRetry={onRetry} />
    );
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not show retry button when warmupFailed but no onRetry', () => {
    render(<BackendWarmupBanner isWarming={false} warmupFailed={true} />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});
