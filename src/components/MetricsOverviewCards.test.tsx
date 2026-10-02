import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlobalStats } from '../types';
import { MetricsOverviewCards } from './MetricsOverviewCards';

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

  it('renders fallback placeholders when metrics are absent or negative', () => {
    const minimalStats: GlobalStats = {
      totalSolves: 10,
      dnfCount: 0,
      bestSingle: null,
      worstSingle: null,
      bestAo5: null,
      bestAo12: null,
      bestAo50: null,
      currentAo5: null,
      currentAo12: null,
      overallMean: 15.0,
      overallMedian: 15.0,
      regression: {
        slope: 0.01,
        intercept: 15.0,
        r2: 0.05,
        slopeFormatted: '+0.0100s/solve',
      },
      initialAvg: 14.0,
      recentAvg: 16.0,
      improvementSec: -2.0,
      improvementPct: -14.3,
    };

    render(<MetricsOverviewCards stats={minimalStats} sessionName="Empty Session" />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('No valid solves')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBe(2); // Ao12 & Ao50
    // Slower recent average (improvementSec < 0) must read as a positive time increase
    expect(screen.getByText('+2s')).toBeInTheDocument();
    expect(screen.queryByText('-2s')).not.toBeInTheDocument();
    expect(screen.getByText('(-14.3%)')).toBeInTheDocument();
    expect(screen.getByText(/0 DNFs/)).toBeInTheDocument();
  });

  it('renders a zero progression change without a misleading sign', () => {
    render(
      <MetricsOverviewCards
        stats={{ ...mockGlobalStats, improvementSec: 0, improvementPct: 0 }}
        sessionName="Flat Session"
      />,
    );

    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });
});
