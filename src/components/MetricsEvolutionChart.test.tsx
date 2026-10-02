import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PeriodGroup } from '../types';
import { MetricsEvolutionChart } from './MetricsEvolutionChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    ComposedChart: ({ children }: { children: React.ReactNode }) => (
      <svg role="img" aria-label="Mock ComposedChart">
        {children}
      </svg>
    ),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Legend: () => null,
    Area: () => null,
    Line: () => null,
    Tooltip: (props: { content?: React.ReactElement }) => {
      captured.tooltipContent = props.content ?? null;
      return null;
    },
  };
});

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Batch 1 (1-50)',
    startDate: new Date(),
    endDate: new Date(),
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
  it('renders metrics evolution chart with daily grouping title', () => {
    const { container } = render(
      <MetricsEvolutionChart
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
        title="Daily Metrics Evolution: Speed & Consistency"
      />,
    );

    expect(screen.getByText('Daily Metrics Evolution: Speed & Consistency')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders with monthly title when grouping by month', () => {
    const { container } = render(
      <MetricsEvolutionChart periodGroups={mockPeriodGroups} groupingPeriod="monthly" />,
    );

    expect(screen.getByText('Monthly Metrics Evolution: Speed & Consistency')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders default daily title when title and groupingPeriod are omitted', () => {
    render(<MetricsEvolutionChart periodGroups={mockPeriodGroups} />);
    expect(screen.getByText('Daily Metrics Evolution: Speed & Consistency')).toBeInTheDocument();
  });

  it('handles empty periodGroups and fast solve times safely', () => {
    // Empty groups
    render(<MetricsEvolutionChart periodGroups={[]} />);
    expect(screen.getByText('Daily Metrics Evolution: Speed & Consistency')).toBeInTheDocument();

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
    expect(activeTooltip.getByText('Day 1 (2020-09-13)')).toBeInTheDocument();
    expect(activeTooltip.getByText('n=15 solves')).toBeInTheDocument();
    expect(activeTooltip.getByText('11.23s')).toBeInTheDocument();
    expect(activeTooltip.getByText('10.95s')).toBeInTheDocument();
    expect(activeTooltip.getByText('1.45s')).toBeInTheDocument();
    expect(activeTooltip.getByText('8.50s - 14.20s')).toBeInTheDocument();
    activeTooltip.unmount();
  });
});
