import { act, render } from '@testing-library/react';
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

    const { container } = render(
      <DeferredChart minHeight={400} fallbackTitle="Test Chart">
        <div className="chart-content">Chart Content</div>
      </DeferredChart>,
    );

    expect(container.querySelector('#deferred-test-chart .chart-content')).toBeInTheDocument();
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

    const { container } = render(
      <DeferredChart minHeight={500} fallbackTitle="PB Progression">
        <div className="chart-content">Chart Content</div>
      </DeferredChart>,
    );

    // Initial state: skeleton fallback (chart content not mounted yet)
    expect(
      container.querySelector('#deferred-pb-progression')?.firstElementChild,
    ).toBeInTheDocument();
    expect(container.querySelector('#deferred-pb-progression .chart-content')).toBeNull();
    expect(observeMock).toHaveBeenCalled();

    // Trigger intersection
    act(() => {
      observerCallback([{ isIntersecting: false }]);
    });
    expect(container.querySelector('#deferred-pb-progression .chart-content')).toBeNull();

    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });

    expect(container.querySelector('#deferred-pb-progression .chart-content')).toBeInTheDocument();
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

    const { container, unmount } = render(
      <DeferredChart minHeight="450px" className="custom-chart-wrapper">
        <div>Content</div>
      </DeferredChart>,
    );

    const deferredChart = container.querySelector('#deferred-chart');
    expect(deferredChart).toBeInTheDocument();
    expect(deferredChart).toHaveClass('custom-chart-wrapper');
    expect(observeMock).toHaveBeenCalled();

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('supports lazy-loaded components with internal Suspense boundary', async () => {
    // @ts-expect-error test environment override
    delete window.IntersectionObserver;

    let resolvePromise: (value: { default: React.FC }) => void = () => {};
    const lazyPromise = new Promise<{ default: React.FC }>((resolve) => {
      resolvePromise = resolve;
    });
    const LazyContent = lazy(() => lazyPromise);

    const { container } = render(
      <DeferredChart minHeight={300} fallbackTitle="Lazy Chart">
        <LazyContent />
      </DeferredChart>,
    );

    expect(container.querySelector('#deferred-lazy-chart .lazy-chart-content')).toBeNull();

    await act(async () => {
      resolvePromise({
        default: () => <div className="lazy-chart-content">Async Chart Loaded</div>,
      });
    });

    expect(container.querySelector('#deferred-lazy-chart .lazy-chart-content')).toBeInTheDocument();
  });
});
