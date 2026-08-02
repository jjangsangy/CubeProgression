import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricsEvolutionChart } from './MetricsEvolutionChart';
import { PeriodGroup } from '../types';

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
      />
    );

    expect(screen.getByText('Daily Metrics Evolution: Speed & Consistency')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('renders with monthly title when grouping by month', () => {
    const { container } = render(
      <MetricsEvolutionChart
        periodGroups={mockPeriodGroups}
        groupingPeriod="monthly"
      />
    );

    expect(screen.getByText('Monthly Metrics Evolution: Speed & Consistency')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});
