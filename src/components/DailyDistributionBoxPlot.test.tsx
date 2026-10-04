import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TOOLTIP_DISMISS_DELAY_MS } from '../hooks/useAutoDismissTooltip';
import type { PeriodGroup } from '../types';
import { parseSolvesList } from '../utils/csTimerParser';
import { groupSolvesByPeriod } from '../utils/statsMath';
import { DailyDistributionBoxPlot } from './DailyDistributionBoxPlot';

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Day 1 (2020-09-13)',
    startDate: Temporal.PlainDate.from('2020-09-13'),
    endDate: Temporal.PlainDate.from('2020-09-13'),
    solves: [
      {
        id: 1,
        index: 1,
        timeMs: 12000,
        rawTimeSec: 12.0,
        finalTimeSec: 12.0,
        penalty: 'OK',
        timestamp: 1600000000000,
        date: Temporal.PlainDate.from('2020-09-13'),
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
        date: Temporal.PlainDate.from('2020-09-13'),
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
    startDate: Temporal.PlainDate.from('2020-09-14'),
    endDate: Temporal.PlainDate.from('2020-09-14'),
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

// Anchor the chart canvas region on its stable id so a missing SVG fails loudly.
const getBoxPlotSvg = (container: HTMLElement): SVGElement => {
  const svg = container.querySelector('#boxplot-svg');
  expect(svg).not.toBeNull();
  return svg as SVGElement;
};

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
        title="Daily Solve Distribution"
      />,
    );

    const chart = container.querySelector('#distribution-chart');
    expect(chart).toBeInTheDocument();

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
    expect(tooltip?.textContent).toContain('Day 1 (2020-09-13)');
    expect(tooltip?.textContent).toContain('Solve: 12.00s');
    expect(tooltip?.getAttribute('style')).toContain('calc(');

    fireEvent.pointerLeave(solveCircle);
    expect(container.querySelector('.pointer-events-none')).toBeNull();

    // Verify outlier diamond polygon is rendered for the 18s solve
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    expect(polygons[0].getAttribute('fill')).toBe('#e11d48');
  });

  it('renders a weekly box plot chart region with plotted boxes when grouping by week', () => {
    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="weekly" />,
    );

    expect(container.querySelector('#distribution-chart')).toBeInTheDocument();
    const svg = getBoxPlotSvg(container);

    // Both period groups carry valid times, so two box rectangles are plotted
    expect(container.querySelectorAll('rect[rx="3"]')).toHaveLength(2);

    // The X-axis title is derived from the grouping period rather than the daily default
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
    expect(texts).toContain('Week');
    expect(texts).not.toContain('Day');
  });

  it('handles empty periodGroups gracefully', () => {
    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={[]} groupingPeriod="daily" />,
    );

    expect(container.querySelector('#distribution-chart')).toBeInTheDocument();
    expect(getBoxPlotSvg(container)).toBeInTheDocument();

    // No period groups -> no box rectangles rendered
    expect(container.querySelectorAll('rect[rx="3"]')).toHaveLength(0);
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
    const boxRect = container.querySelector('rect[rx="3"]');
    expect(boxRect).not.toBeNull();
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
    const texts = Array.from(getBoxPlotSvg(container).querySelectorAll('text')).map(
      (t) => t.textContent,
    );
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
    const chartSvg = () => container.querySelector('#boxplot-svg');
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

    expect(getBoxPlotSvg(container).getAttribute('viewBox')).toBe('0 0 300 400');
  });

  it('includes mobile and tablet/desktop responsive height classes on the SVG element', () => {
    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
    );

    const svg = getBoxPlotSvg(container);
    const classes = svg.getAttribute('class') || '';
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
      expect(getBoxPlotSvg(container).getAttribute('viewBox')).toBe('0 0 750 400');
    } finally {
      clientWidthSpy.mockRestore();
    }
  });

  it('renders compact mobile portrait layout with the rotated axis label omitted', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      const { container } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      const svg = getBoxPlotSvg(container);
      // Mobile portrait uses the shorter viewBox height
      expect(svg.getAttribute('viewBox')).toBe('0 0 1000 380');

      // Rotated desktop-only Y-axis label is omitted on mobile
      expect(svg.querySelector('text[transform]')).toBeNull();

      // Numeric Y-axis ticks are rendered
      const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
      expect(texts).toContain('10');
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders the rotated Y-axis label on desktop and no mobile-only layout', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 1024;
      const { container } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      const svg = getBoxPlotSvg(container);
      expect(svg.getAttribute('viewBox')).toBe('0 0 1000 400');

      // Standard rotated Y-axis label is present on desktop
      expect(svg.querySelector('text[transform]')).not.toBeNull();

      // Numeric Y-axis ticks are rendered
      const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
      expect(texts).toContain('10');
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
      const { container, unmount } = render(
        <DailyDistributionBoxPlot periodGroups={mockPeriodGroups} groupingPeriod="daily" />,
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(getBoxPlotSvg(container).getAttribute('viewBox')).toBe('0 0 1000 400');

      act(() => {
        window.innerWidth = 375;
        fireEvent(window, new Event('resize'));
      });

      expect(getBoxPlotSvg(container).getAttribute('viewBox')).toBe('0 0 1000 380');

      act(() => {
        window.innerWidth = 1024;
        fireEvent(window, new Event('resize'));
      });

      expect(getBoxPlotSvg(container).getAttribute('viewBox')).toBe('0 0 1000 400');

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('provides an accessible image region labeled by the title prop', () => {
    const { container } = render(
      <DailyDistributionBoxPlot
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
        title="Custom Distribution"
      />,
    );

    const svg = getBoxPlotSvg(container);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Custom Distribution');
  });

  it('gracefully handles period groups with 0 valid solves without plotting off-screen elements', () => {
    const solves = parseSolvesList([
      [[0, 15000], 'R U R', '', 1600000000], // Valid solve on Day 1
      [[-1, 15000], 'R U R', '', 1600086400], // DNF solve on Day 2 (0 valid times)
    ]);
    const groupsWithEmptyGroup = groupSolvesByPeriod(solves, 'daily');

    const { container } = render(
      <DailyDistributionBoxPlot periodGroups={groupsWithEmptyGroup} groupingPeriod="daily" />,
    );

    const svg = getBoxPlotSvg(container);

    // Period tick indices are both rendered on the X-axis
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
    expect(texts).toContain('1');
    expect(texts).toContain('2');

    // Exactly 1 box rect is rendered (the empty group does not render an off-scale box)
    const boxes = container.querySelectorAll('rect[rx="3"]');
    expect(boxes.length).toBe(1);
  });

  it('auto-dismisses tooltip after touch release delay', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <DailyDistributionBoxPlot
          periodGroups={mockPeriodGroups}
          groupingPeriod="daily"
          title="Daily Solve Distribution"
        />,
      );

      const chartWrapper = getBoxPlotSvg(container).parentElement;
      expect(chartWrapper).not.toBeNull();
      if (!chartWrapper) return;

      const solveCircle = Array.from(container.querySelectorAll('circle')).find((c) =>
        c.getAttribute('class')?.includes('cursor-pointer'),
      );
      expect(solveCircle).toBeDefined();
      if (!solveCircle) return;

      // 1. User touches circle
      fireEvent.touchStart(solveCircle);
      expect(container.querySelector('.pointer-events-none')?.textContent).toContain(
        'Solve: 12.00s',
      );

      // 2. User lifts touch and timer elapses -> auto-dismisses
      fireEvent.touchEnd(chartWrapper);
      act(() => {
        vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS);
      });
      expect(container.querySelector('.pointer-events-none')).toBeNull();

      // 3. Desktop mouse hover still works normally
      fireEvent.pointerEnter(solveCircle);
      expect(container.querySelector('.pointer-events-none')).not.toBeNull();
      fireEvent.pointerLeave(solveCircle);
      expect(container.querySelector('.pointer-events-none')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
