import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    fireEvent.pointerLeave(solveCircle);
    expect(container.querySelector('.pointer-events-none')).toBeNull();
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
});
