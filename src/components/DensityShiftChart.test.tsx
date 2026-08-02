import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DensityShiftChart } from './DensityShiftChart';
import { Solve } from '../types';

const mockSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 12000 - idx * 100,
  rawTimeSec: (12000 - idx * 100) / 1000,
  finalTimeSec: (12000 - idx * 100) / 1000,
  penalty: 'OK',
  timestamp: 1600000000000 + idx * 100000,
  date: new Date(1600000000000 + idx * 100000),
  dateStr: '2020-09-13',
}));

describe('DensityShiftChart component', () => {
  it('renders density shift chart and baseline vs recent summary', () => {
    render(
      <DensityShiftChart
        solves={mockSolves}
        title="Time Distribution Shift: Baseline vs. Recent Solves"
      />
    );

    expect(
      screen.getByText('Time Distribution Shift: Baseline vs. Recent Solves')
    ).toBeInTheDocument();
    expect(screen.getByText('Baseline Mean:')).toBeInTheDocument();
    expect(screen.getByText('Recent Mean:')).toBeInTheDocument();
  });

  it('allows changing sample split percent', () => {
    render(
      <DensityShiftChart
        solves={mockSolves}
        title="Time Distribution Shift: Baseline vs. Recent Solves"
      />
    );

    const splitBtn20 = screen.getByText('20%');
    fireEvent.click(splitBtn20);
    expect(splitBtn20).toHaveClass('bg-amber-500');
  });
});
