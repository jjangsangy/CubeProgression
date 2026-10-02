import { act, render, screen } from '@testing-library/react';
import { lazy } from 'react';
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

    render(
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
      observerCallback([{ isIntersecting: false }]);
    });
    expect(screen.queryByTestId('chart-content')).not.toBeInTheDocument();

    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('renders without fallbackTitle and cleans up observer on unmount', () => {
    const disconnectMock = vi.fn();
    const observeMock = vi.fn();

    class MockIntersectionObserver {
      observe = observeMock;
      disconnect = disconnectMock;
      unobserve = vi.fn();
    }

    // @ts-expect-error test mock
    window.IntersectionObserver = MockIntersectionObserver;

    const { unmount } = render(
      <DeferredChart minHeight="450px" className="custom-chart-wrapper">
        <div>Content</div>
      </DeferredChart>,
    );

    expect(screen.getByTestId('deferred-chart')).toBeInTheDocument();
    expect(screen.getByTestId('deferred-chart')).toHaveClass('custom-chart-wrapper');
    expect(observeMock).toHaveBeenCalled();

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('supports lazy-loaded components with internal Suspense boundary', async () => {
    // @ts-expect-error test environment override
    delete window.IntersectionObserver;

    const LazyContent = lazy(
      () =>
        new Promise<{ default: React.FC }>((resolve) => {
          setTimeout(() => {
            resolve({
              default: () => <div data-testid="lazy-chart-content">Async Chart Loaded</div>,
            });
          }, 10);
        }),
    );

    render(
      <DeferredChart minHeight={300} fallbackTitle="Lazy Chart">
        <LazyContent />
      </DeferredChart>,
    );

    expect(await screen.findByTestId('lazy-chart-content')).toBeInTheDocument();
  });
});
