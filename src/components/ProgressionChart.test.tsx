import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressionChart } from './ProgressionChart';
import { Solve, PeriodGroup, LinearRegression } from '../types';

const mockSolves: Solve[] = [
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
    timeMs: 11000,
    rawTimeSec: 11.0,
    finalTimeSec: 11.0,
    penalty: 'OK',
    timestamp: 1600000100000,
    date: new Date(1600000100000),
    dateStr: '2020-09-13',
  },
];

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Day 1',
    startDate: new Date(),
    endDate: new Date(),
    solves: mockSolves,
    timesSec: [11.0, 12.0],
    mean: 11.5,
    median: 11.5,
    min: 11.0,
    max: 12.0,
    stdDev: 0.5,
    q1: 11.0,
    q3: 12.0,
    iqr: 1.0,
    whiskerLow: 11.0,
    whiskerHigh: 12.0,
    outliers: [],
  },
];

const mockRegression: LinearRegression = {
  slope: -0.01,
  intercept: 12.0,
  r2: 0.5,
  slopeFormatted: '-0.0100s/solve',
};

describe('ProgressionChart component', () => {
  it('renders chart title, slope info, and solve visibility controls', () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="daily"
        title="Progression Over Solves"
      />
    );

    expect(screen.getByText('Progression Over Solves')).toBeInTheDocument();
    expect(screen.getByText('-0.0100s/solve')).toBeInTheDocument();
    expect(screen.getByText('R² = 50.0%')).toBeInTheDocument();

    expect(screen.getByText('Muted')).toBeInTheDocument();
    expect(screen.getByText('Unmuted')).toBeInTheDocument();
    expect(screen.getByText('With Dots')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('renders correctly with weekly groupingPeriod', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="weekly"
        title="Progression Over Solves"
      />
    );

    expect(screen.getByText('Progression Over Solves')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});
