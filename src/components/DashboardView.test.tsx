import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlobalStats, PeriodGroup, Session } from '../types';
import { DashboardView } from './DashboardView';

describe('DashboardView', () => {
  const mockSession: Session = {
    id: 'test_session',
    name: '3x3 Practice',
    solves: [
      {
        id: 1,
        index: 1,
        timeMs: 12500,
        rawTimeSec: 12.5,
        finalTimeSec: 12.5,
        penalty: 'OK',
        timestamp: 1600000000000,
        date: Temporal.PlainDate.from('2020-09-13'),
        dateStr: '2020-09-13',
      },
      {
        id: 2,
        index: 2,
        timeMs: 11500,
        rawTimeSec: 11.5,
        finalTimeSec: 11.5,
        penalty: 'OK',
        timestamp: 1600000060000,
        date: Temporal.PlainDate.from('2020-09-13'),
        dateStr: '2020-09-13',
      },
    ],
  };

  const mockStats: GlobalStats = {
    totalSolves: 2,
    dnfCount: 0,
    bestSingle: mockSession.solves[1],
    worstSingle: mockSession.solves[0],
    bestAo5: null,
    bestAo12: null,
    bestAo50: null,
    currentAo5: null,
    currentAo12: null,
    overallMean: 12.0,
    overallMedian: 12.0,
    initialAvg: 12.5,
    recentAvg: 11.5,
    improvementSec: 1.0,
    improvementPct: 8.0,
    regression: {
      slope: -1.0,
      intercept: 13.5,
      r2: 1.0,
      slopeFormatted: '-1.0s/solve',
    },
  };

  const mockPeriodGroups: PeriodGroup[] = [
    {
      label: 'Day 1 (Sep 13, 2020)',
      startDate: Temporal.PlainDate.from('2020-09-13'),
      endDate: Temporal.PlainDate.from('2020-09-13'),
      solves: mockSession.solves,
      timesSec: [12.5, 11.5],
      mean: 12.0,
      median: 12.0,
      min: 11.5,
      max: 12.5,
      q1: 11.75,
      q3: 12.25,
      iqr: 0.5,
      whiskerLow: 11.5,
      whiskerHigh: 12.5,
      outliers: [],
      stdDev: 0.5,
    },
  ];

  it('renders nothing when session is null', () => {
    const { container } = render(
      <DashboardView
        session={null}
        stats={mockStats}
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when stats is null', () => {
    const { container } = render(
      <DashboardView
        session={mockSession}
        stats={null}
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all 4 progression charts, metric cards, and solves table when data is provided', async () => {
    const { container } = render(
      <DashboardView
        session={mockSession}
        stats={mockStats}
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
      />,
    );

    const dashboard = container.querySelector('#dashboard-view');
    expect(dashboard).toBeInTheDocument();

    // Metric cards render
    expect(container.querySelector('#metrics-overview')).toBeInTheDocument();

    // 3 of the 4 progression charts are lazy-loaded behind DeferredChart/Suspense,
    // so await their mounted cards rather than asserting on display copy.
    expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    expect(container.querySelector('#distribution-chart')).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('#pb-progression-chart')).toBeInTheDocument();
      expect(container.querySelector('#density-shift-chart')).toBeInTheDocument();
      expect(container.querySelector('#metrics-evolution-chart')).toBeInTheDocument();
    });

    // Solves table renders
    expect(container.querySelector('#solves-table')).toBeInTheDocument();
  });
});
