import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricsOverviewCards } from './MetricsOverviewCards';
import { GlobalStats } from '../types';

const mockGlobalStats: GlobalStats = {
  totalSolves: 100,
  dnfCount: 2,
  bestSingle: {
    id: 1,
    index: 1,
    timeMs: 8500,
    rawTimeSec: 8.5,
    finalTimeSec: 8.5,
    penalty: 'OK',
    timestamp: 1600000000000,
    date: new Date(1600000000000),
    dateStr: '2020-09-13',
  },
  worstSingle: null,
  bestAo5: 10.2,
  bestAo12: 11.4,
  bestAo50: 12.1,
  currentAo5: 10.8,
  currentAo12: 11.6,
  overallMean: 12.5,
  overallMedian: 12.2,
  regression: {
    slope: -0.015,
    intercept: 14.2,
    r2: 0.65,
    slopeFormatted: '-0.0150s/solve',
  },
  initialAvg: 14.5,
  recentAvg: 11.2,
  improvementSec: 3.3,
  improvementPct: 22.8,
};

describe('MetricsOverviewCards component', () => {
  it('renders summary cards with formatted metrics', () => {
    render(<MetricsOverviewCards stats={mockGlobalStats} sessionName="3x3 Session" />);

    expect(screen.getByText('Best Single')).toBeInTheDocument();
    expect(screen.getByText('8.50s')).toBeInTheDocument();
    expect(screen.getByText('11.40s')).toBeInTheDocument(); // Ao12
    expect(screen.getByText('12.10s')).toBeInTheDocument(); // Ao50
    expect(screen.getByText('-0.0150s/solve')).toBeInTheDocument();
    expect(screen.getByText('-3.3s')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/2 DNFs/)).toBeInTheDocument();
  });
});
