import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Solve } from '../types';
import { DensityShiftChart } from './DensityShiftChart';

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
      />,
    );

    expect(
      screen.getByText('Time Distribution Shift: Baseline vs. Recent Solves'),
    ).toBeInTheDocument();
    expect(screen.getByText('Baseline Mean:')).toBeInTheDocument();
    expect(screen.getByText('Recent Mean:')).toBeInTheDocument();
    // Baseline (first 30%) is slower than recent (last 30%) -> distribution shifted faster
    expect(screen.getByText('-1.40s faster')).toBeInTheDocument();
  });

  it('labels the shift as slower when recent solves are slower than the baseline', () => {
    const slowingSolves: Solve[] = mockSolves.map((solve, idx) => ({
      ...solve,
      finalTimeSec: 10 + idx * 0.1,
    }));

    render(<DensityShiftChart solves={slowingSolves} title="Slower Distribution Shift" />);

    // Baseline (first 30%) mean 10.25s vs recent (last 30%) mean 11.65s -> +1.40s slower
    expect(screen.getByText('+1.40s slower')).toBeInTheDocument();
    expect(screen.queryByText(/faster/)).not.toBeInTheDocument();
  });

  it('allows changing sample split percent', () => {
    render(
      <DensityShiftChart
        solves={mockSolves}
        title="Time Distribution Shift: Baseline vs. Recent Solves"
      />,
    );

    const splitBtn20 = screen.getByText('20%');
    fireEvent.click(splitBtn20);
    expect(splitBtn20).toHaveClass('bg-amber-500');
  });
});
