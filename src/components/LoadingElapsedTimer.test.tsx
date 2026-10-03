import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingElapsedTimer } from './LoadingElapsedTimer';

describe('LoadingElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial state with 0.00s and animated timer icon', () => {
    render(<LoadingElapsedTimer />);

    expect(screen.getByText('0.00s')).toBeInTheDocument();
    const container = screen.getByText('0.00s').closest('span');
    expect(container).toHaveClass('font-semibold', 'text-amber-400');
  });

  it('updates elapsed time at 250ms intervals by default', () => {
    render(<LoadingElapsedTimer />);

    expect(screen.getByText('0.00s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText('0.25s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText('0.50s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('1.00s')).toBeInTheDocument();
  });

  it('supports custom intervalMs prop', () => {
    render(<LoadingElapsedTimer intervalMs={200} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('0.20s')).toBeInTheDocument();
  });

  it('supports custom initialStartTime prop', () => {
    const fixedStartTime = Temporal.Now.instant().epochMilliseconds - 1000;
    render(<LoadingElapsedTimer initialStartTime={fixedStartTime} />);

    expect(screen.getByText('1.00s')).toBeInTheDocument();
  });

  it('cleans up interval on unmount without throwing errors', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<LoadingElapsedTimer />);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
