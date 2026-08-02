import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DailyDistributionBoxPlot } from './DailyDistributionBoxPlot';
import { PeriodGroup } from '../types';

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Day 1 (2020-09-13)',
    startDate: new Date(),
    endDate: new Date(),
    solves: [],
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
];

describe('DailyDistributionBoxPlot component', () => {
  it('renders box plot chart with group metrics for daily period', () => {
    render(
      <DailyDistributionBoxPlot
        periodGroups={mockPeriodGroups}
        groupingPeriod="daily"
        title="Daily Solve Time Distribution & Variance"
      />
    );

    expect(screen.getByText('Daily Solve Time Distribution & Variance')).toBeInTheDocument();
    expect(screen.getByText('Solve Time (seconds)')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Median Trend')).toBeInTheDocument();
  });

  it('renders box plot chart with weekly axis label when grouping by week', () => {
    render(
      <DailyDistributionBoxPlot
        periodGroups={mockPeriodGroups}
        groupingPeriod="weekly"
      />
    );

    expect(screen.getByText('Weekly Solve Time Distribution & Variance')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
  });
});
