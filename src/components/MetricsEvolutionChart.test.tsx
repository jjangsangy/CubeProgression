import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyChartTooltipAutoDismiss } from '../test/tooltipTestUtils';
import type { PeriodGroup } from '../types';
import { MetricsEvolutionChart } from './MetricsEvolutionChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
  tooltipActive: undefined as boolean | undefined,
  chartProps: null as {
    margin?: { top: number; right: number; left: number; bottom: number };
  } | null,
  yAxes: [] as Array<{
    yAxisId?: string;
    orientation?: string;
    width?: number;
    fontSize?: number;
    label?: {
      value?: string;
      offset?: number;
      fontSize?: number;
    };
  }>,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    ComposedChart: (props: {
      children: React.ReactNode;
      margin?: { top: number; right: number; left: number; bottom: number };
    }) => {
      captured.chartProps = props;
      return (
        <svg id="mock-composed-chart" role="img" aria-label="Mock ComposedChart">
          {props.children}
        </svg>
      );
    },
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: (props: {
      yAxisId?: string;
      orientation?: string;
      width?: number;
      fontSize?: number;
      label?: {
        value?: string;
        offset?: number;
        fontSize?: number;
      };
    }) => {
      captured.yAxes.push(props);
      return null;
    },
    Legend: (props: { content?: React.ReactElement }) => props.content ?? null,
    Area: () => null,
    Line: () => null,
    Tooltip: (props: { content?: React.ReactElement; active?: boolean }) => {
      captured.tooltipContent = props.content ?? null;
      captured.tooltipActive = props.active;
      return null;
    },
  };
});

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Batch 1 (1-50)',
    startDate: '2020-09-13',
    endDate: '2020-09-13',
    solves: [],
    timesSec: [10, 11, 12],
    mean: 11.0,
    median: 11.0,
    min: 10.0,
    max: 12.0,
    stdDev: 0.82,
    q1: 10.5,
    q3: 11.5,
    iqr: 1.0,
    whiskerLow: 10.0,
    whiskerHigh: 12.0,
    outliers: [],
  },
];

describe('MetricsEvolutionChart component', () => {
  beforeEach(() => {
    captured.yAxes = [];
    captured.chartProps = null;
  });

  it('renders metrics evolution chart with daily grouping title', () => {
    const { container } = render(
      <MetricsEvolutionChart
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
        title="Daily Speed & Consistency"
      />,
    );

    const chart = container.querySelector('#metrics-evolution-chart');
    expect(chart).toBeInTheDocument();
    expect(chart?.querySelector('h2')?.textContent).toContain('Daily Speed & Consistency');
  });

  it('renders with monthly title when grouping by month', () => {
    const { container } = render(
      <MetricsEvolutionChart periodGroups={mockPeriodGroups} groupingPeriod="monthly" />,
    );

    const chart = container.querySelector('#metrics-evolution-chart');
    expect(chart).toBeInTheDocument();
    expect(chart?.querySelector('h2')?.textContent).toContain('Monthly');
  });

  it('renders default daily title when title and groupingPeriod are omitted', () => {
    const { container } = render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);
    const chart = container.querySelector('#metrics-evolution-chart');
    expect(chart).toBeInTheDocument();
    expect(chart?.querySelector('h2')?.textContent).toContain('Daily');
  });

  it('handles empty periodGroups and fast solve times safely', () => {
    // Empty groups
    const { container } = render(<MetricsEvolutionChart periodGroups={[]} />);
    expect(container.querySelector('#metrics-evolution-chart')).toBeInTheDocument();

    // Fast solves with min < 2 to exercise Math.max(0, ...)
    const fastGroup: PeriodGroup = {
      ...mockPeriodGroups[0],
      min: 1.0,
      max: 3.0,
      mean: 1.8,
      median: 1.8,
    };
    render(<MetricsEvolutionChart periodGroups={[fastGroup]} />);
  });

  it('renders CustomTooltip correctly for active and inactive states', () => {
    render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);

    const content = captured.tooltipContent as React.ReactElement<{
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
    }> | null;
    expect(content).not.toBeNull();
    if (!content) return;

    // Inactive returns null
    const inactive = render(React.cloneElement(content, { active: false, payload: [] }));
    expect(inactive.container).toBeEmptyDOMElement();
    inactive.unmount();

    // Active tooltip
    const activePayload = [
      {
        payload: {
          label: 'Day 1 (2020-09-13)',
          solveCount: 15,
          mean: 11.23,
          median: 10.95,
          stdDev: 1.45,
          min: 8.5,
          max: 14.2,
        },
      },
    ];

    const activeTooltip = render(
      React.cloneElement(content, { active: true, payload: activePayload }),
    );
    const tooltipText = activeTooltip.container.textContent ?? '';
    expect(tooltipText).toMatch(/Day 1 \(2020-09-13\)/);
    expect(tooltipText).toContain('n=15 solves');
    expect(tooltipText).toMatch(/11\.23s/);
    expect(tooltipText).toMatch(/10\.95s/);
    expect(tooltipText).toMatch(/1\.45s/);
    expect(tooltipText).toMatch(/8\.50s - 14\.20s/);
    activeTooltip.unmount();
  });

  it('renders bottom axis titles and maximizes chart width with compact Y-axes on mobile portrait', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);

      // Chart margins are minimized
      expect(captured.chartProps?.margin).toEqual({
        top: 15,
        right: 4,
        left: 2,
        bottom: 20,
      });

      const leftAxis = captured.yAxes.find((a) => a.yAxisId === 'left');
      const rightAxis = captured.yAxes.find((a) => a.yAxisId === 'right');

      // Both Y-axes have minimized widths for maximum plot width on mobile
      expect(leftAxis?.width).toBe(26);
      expect(leftAxis?.label).toBeUndefined();

      expect(rightAxis?.width).toBe(20);
      expect(rightAxis?.label).toBeUndefined();
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders standard rotated Y-axis labels on desktop and tablet without bottom text', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 1024;
      render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);

      expect(captured.chartProps?.margin).toEqual({
        top: 20,
        right: 12,
        left: 6,
        bottom: 25,
      });

      const leftAxis = captured.yAxes.find((a) => a.yAxisId === 'left');
      const rightAxis = captured.yAxes.find((a) => a.yAxisId === 'right');

      // Standard desktop widths with rotated axis labels
      expect(leftAxis?.width).toBe(42);
      expect(leftAxis?.label?.value).toBe('Time (s)');

      expect(rightAxis?.width).toBe(42);
      expect(rightAxis?.label?.value).toBe('Std Dev (s)');
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
      const { unmount } = render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // Trigger resize to mobile
      act(() => {
        window.innerWidth = 375;
        fireEvent(window, new Event('resize'));
      });

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('wires touch auto-dismiss to chart container and recharts tooltip', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);
      const chartSvg = container.querySelector('#mock-composed-chart');
      const chartWrapper = chartSvg?.parentElement;
      expect(chartWrapper).not.toBeNull();
      if (!chartWrapper) return;

      verifyChartTooltipAutoDismiss(chartWrapper, () => captured.tooltipActive);
    } finally {
      vi.useRealTimers();
    }
  });
});
