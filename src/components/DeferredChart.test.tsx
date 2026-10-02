import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredChart } from './DeferredChart';

describe('DeferredChart component', () => {
  const originalIntersectionObserver = window.IntersectionObserver;

  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
  });

  it('renders children immediately when IntersectionObserver is not available', () => {
    // @ts-expect-error test environment override
    delete window.IntersectionObserver;

    render(
      <DeferredChart minHeight={400}>
        <div data-testid="chart-content">Chart Content</div>
      </DeferredChart>,
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('renders skeleton fallback and loads chart when intersecting', () => {
    let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
    const disconnectMock = vi.fn();
    const observeMock = vi.fn();

    class MockIntersectionObserver {
      observe = observeMock;
      disconnect = disconnectMock;
      unobserve = vi.fn();
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        observerCallback = callback;
      }
    }

    // @ts-expect-error test mock
    window.IntersectionObserver = MockIntersectionObserver;

    const { rerender } = render(
      <DeferredChart minHeight={500} fallbackTitle="PB Progression">
        <div data-testid="chart-content">Chart Content</div>
      </DeferredChart>,
    );

    // Initial state: skeleton fallback
    expect(screen.getByText('Loading PB Progression...')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-content')).not.toBeInTheDocument();
    expect(observeMock).toHaveBeenCalled();

    // Trigger intersection
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });
    rerender(
      <DeferredChart minHeight={500} fallbackTitle="PB Progression">
        <div data-testid="chart-content">Chart Content</div>
      </DeferredChart>,
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
