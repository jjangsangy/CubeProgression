import { act, render } from '@testing-library/react';
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
    const { container } = render(<LoadingElapsedTimer />);

    const timer = container.querySelector('#loading-elapsed-timer');
    expect(timer).toBeInTheDocument();
    expect(timer?.textContent).toContain('0.00s');
    expect(timer).toHaveClass('font-semibold', 'text-amber-400');
  });

  it('updates elapsed time at 250ms intervals by default', () => {
    const { container } = render(<LoadingElapsedTimer />);

    const timer = container.querySelector('#loading-elapsed-timer');
    expect(timer?.textContent).toContain('0.00s');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(timer?.textContent).toContain('0.25s');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(timer?.textContent).toContain('0.50s');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(timer?.textContent).toContain('1.00s');
  });

  it('supports custom intervalMs prop', () => {
    const { container } = render(<LoadingElapsedTimer intervalMs={200} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    const timer = container.querySelector('#loading-elapsed-timer');
    expect(timer?.textContent).toContain('0.20s');
  });

  it('supports custom initialStartTime prop', () => {
    const fixedStartTime = Temporal.Now.instant().epochMilliseconds - 1000;
    const { container } = render(<LoadingElapsedTimer initialStartTime={fixedStartTime} />);

    const timer = container.querySelector('#loading-elapsed-timer');
    expect(timer?.textContent).toContain('1.00s');
  });

  it('cleans up interval on unmount without throwing errors', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<LoadingElapsedTimer />);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
