import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PeriodGroup } from '../types';
import { DailyDistributionBoxPlot } from './DailyDistributionBoxPlot';

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Day 1 (2020-09-13)',
    startDate: new Date(),
    endDate: new Date(),
    solves: [
      {
        id: 1,
        index: 1,
        timeMs: 12000,
        rawTimeSec: 12.0,
        finalTimeSec: 12.0,
        penalty: 'OK',
        timestamp: 1600000000000,
        date: new Date(1600000000000),
        dateStr: '2020-09-13',
      },
      {
        id: 2,
        index: 2,
        timeMs: 18000,
        rawTimeSec: 18.0,
        finalTimeSec: 18.0,
        penalty: 'OK',
        timestamp: 1600000060000,
        date: new Date(1600000060000),
        dateStr: '2020-09-13',
      },
    ],
    timesSec: [10, 11, 12, 13, 14],
    mean: 12,
    median: 12,
    min: 10,
    max: 14,
    stdDev: 1.41,
    q1: 11,
    q3: 13,
    iqr: 2,
    whiskerLow: 10,
    whiskerHigh: 14,
    outliers: [18],
  },
  {
    label: 'Day 2 (2020-09-14)',
    startDate: new Date(),
    endDate: new Date(),
    solves: [],
    timesSec: [11, 12, 13],
    mean: 12,
    median: 12,
    min: 11,
    max: 13,
    stdDev: 0.82,
    q1: 11.5,
    q3: 12.5,
    iqr: 1,
    whiskerLow: 11,
    whiskerHigh: 13,
    outliers: [],
  },
];

describe('DailyDistributionBoxPlot component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders box plot chart with group metrics for daily period and shows a hover tooltip', () => {
    const { container } = render(
      <DailyDistributionBoxPlot
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
        title="Daily Solve Time Distribution & Variance"
      />,
    );

    expect(screen.getByText('Daily Solve Time Distribution & Variance')).toBeInTheDocument();
    expect(screen.getByText('Solve Time (seconds)')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Median Trend')).toBeInTheDocument();

    // The hover tooltip is not rendered until a solve point is hovered
    expect(container.querySelector('.pointer-events-none')).toBeNull();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);

    const solveCircle = Array.from(circles).find((c) =>
      c.getAttribute('class')?.includes('cursor-pointer'),
    );
    expect(solveCircle).toBeDefined();
    if (!solveCircle) return;

    fireEvent.pointerEnter(solveCircle);
    const tooltip = container.querySelector('.pointer-events-none');
    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveTextContent('Day 1 (2020-09-13)');
    expect(tooltip).toHaveTextContent('Solve: 12.00s');
    expect(tooltip?.getAttribute('style')).toContain('calc(');

    fireEvent.pointerLeave(solveCircle);
    expect(container.querySelector('.pointer-events-none')).toBeNull();

    // Verify outlier diamond polygon is rendered for the 18s solve
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    expect(polygons[0].getAttribute('fill')).toBe('#ef4444');
  });

  it('renders box plot chart with weekly axis label when grouping by week', () => {
    render(<DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="weekly" />);

    expect(screen.getByText('Weekly Solve Time Distribution & Variance')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
  });

  it('handles empty periodGroups gracefully', () => {
    render(<DailyDistributionBoxPlot periodGroups={[]} groupingPeriod="daily" />);
    expect(screen.getByText('Daily Solve Time Distribution & Variance')).toBeInTheDocument();
  });

  it('handles single-solve groups with IQR = 0 and suppresses median polyline', () => {
    const singleSolveGroup: PeriodGroup[] = [
      {
        ...mockPeriodGroups[0],
        solves: [mockPeriodGroups[0].solves[0]],
        timesSec: [12.0],
        mean: 12.0,
        median: 12.0,
        min: 12.0,
        max: 12.0,
        q1: 12.0,
        q3: 12.0,
        iqr: 0,
        whiskerLow: 12.0,
        whiskerHigh: 12.0,
        outliers: [],
      },
    ];

    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={singleSolveGroup} groupingPeriod="daily" />,
    );

    // Box height should clamp to at least 2px
    const rects = container.querySelectorAll('rect');
    const boxRect = Array.from(rects).find((r) => r.getAttribute('stroke') === '#1e293b');
    expect(boxRect?.getAttribute('height')).toBe('2');

    // Median trend polyline is only drawn if medianPoints.length > 1
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBe(0);
  });

  it('filters X-axis ticks responsively when period group count is high', () => {
    const manyGroups: PeriodGroup[] = Array.from({ length: 40 }, (_, idx) => ({
      ...mockPeriodGroups[0],
      label: `Day ${idx + 1}`,
    }));

    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={manyGroups} groupingPeriod="daily" />,
    );

    // With 40 groups, step = 5, so idx=0 (1), idx=4 (5), and idx=39 (40) render X-axis labels
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(texts).toContain('1');
    expect(texts).not.toContain('2');
    expect(texts).toContain('5');
    expect(texts).toContain('40');
  });

  it('updates the rendered chart width when ResizeObserver reports an entry width', () => {
    let capturedCallback: ResizeObserverCallback | undefined;

    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        capturedCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', TestResizeObserver);

    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
    );

    expect(capturedCallback).toBeDefined();

    // Default state width is 1000 until the observer reports a size
    const chartSvg = () => container.querySelector('svg[preserveAspectRatio="none"]');
    expect(chartSvg()?.getAttribute('viewBox')).toBe('0 0 1000 400');

    act(() => {
      capturedCallback?.(
        [
          {
            contentRect: { width: 950 } as DOMRectReadOnly,
            target: container,
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    });

    expect(chartSvg()?.getAttribute('viewBox')).toBe('0 0 950 400');
  });

  it('clamps SVG viewBox width to minimum 300px when container is narrower than 300px', () => {
    let capturedCallback: ResizeObserverCallback | undefined;

    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        capturedCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', TestResizeObserver);

    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
    );

    act(() => {
      capturedCallback?.(
        [
          {
            contentRect: { width: 280 } as DOMRectReadOnly,
            target: container,
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      );
    });

    const svg = container.querySelector('svg[preserveAspectRatio="none"]');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 400');
  });

  it('includes mobile and tablet/desktop responsive height classes on the SVG element', () => {
    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
    );

    const svg = container.querySelector('svg[preserveAspectRatio="none"]');
    const classes = svg?.getAttribute('class') || '';
    expect(classes).toContain('h-[380px]');
    expect(classes).toContain('sm:h-[400px]');
  });

  it('falls back to containerRef.current.clientWidth when ResizeObserver is undefined', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(750);

    try {
      const { container } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );
      const svg = container.querySelector('svg[preserveAspectRatio="none"]');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 750 400');
    } finally {
      clientWidthSpy.mockRestore();
    }
  });

  it('renders bottom axis title and maximizes chart width with compact Y-axis on mobile portrait', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      const { container } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      // Bottom title is rendered on mobile portrait
      expect(screen.getByText('Time (s)')).toBeInTheDocument();

      // Rotated axis label inside SVG is omitted
      expect(screen.queryByText('Solve Time (seconds)')).toBeNull();

      // Ticks are rendered
      const ticks = container.querySelectorAll('svg text[data-testid="y-axis-tick"]');
      expect(ticks.length).toBeGreaterThan(0);
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders standard rotated Y-axis label on desktop without bottom text', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 1024;
      const { container } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      expect(screen.getByText('Solve Time (seconds)')).toBeInTheDocument();
      expect(screen.queryByText('Time (s)')).not.toBeInTheDocument();

      // Ticks are rendered
      const ticks = container.querySelectorAll('svg text[data-testid="y-axis-tick"]');
      expect(ticks.length).toBeGreaterThan(0);
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('updates mobile responsive state on resize and cleans up listeners on unmount', () => {
    const originalInnerWidth = window.innerWidth;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    try {
      window.innerWidth = 1024;
      const { unmount } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(screen.getByText('Solve Time (seconds)')).toBeInTheDocument();
      expect(screen.queryByText('Time (s)')).not.toBeInTheDocument();

      act(() => {
        window.innerWidth = 375;
        fireEvent(window, new Event('resize'));
      });

      expect(screen.getByText('Time (s)')).toBeInTheDocument();
      expect(screen.queryByText('Solve Time (seconds)')).not.toBeInTheDocument();

      act(() => {
        window.innerWidth = 1024;
        fireEvent(window, new Event('resize'));
      });

      expect(screen.getByText('Solve Time (seconds)')).toBeInTheDocument();
      expect(screen.queryByText('Time (s)')).not.toBeInTheDocument();

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('provides accessible aria-label when title prop is omitted', () => {
    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
    );

    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('aria-label')).toBe('Daily Solve Time Distribution & Variance');
  });
});
