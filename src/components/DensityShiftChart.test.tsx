import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Solve } from '../types';
import { DensityShiftChart } from './DensityShiftChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <svg role="img" aria-label="Mock AreaChart">
        {children}
      </svg>
    ),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Legend: () => null,
    Area: () => null,
    Tooltip: (props: { content?: React.ReactElement }) => {
      captured.tooltipContent = props.content ?? null;
      return null;
    },
  };
});

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

    const splitBtn40 = screen.getByText('40%');
    fireEvent.click(splitBtn40);
    expect(splitBtn40).toHaveClass('bg-amber-500');
  });

  it('labels the shift as "no change" when baseline and recent means are identical', () => {
    // Solves with symmetrical times so baseline mean equals recent mean
    const flatSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
      ...mockSolves[0],
      id: idx + 1,
      index: idx + 1,
      finalTimeSec: 10.0,
    }));

    render(<DensityShiftChart solves={flatSolves} />);
    expect(screen.getByText('no change')).toBeInTheDocument();
  });

  it('hides mean shift summary when valid solves are fewer than 10', () => {
    render(<DensityShiftChart solves={mockSolves.slice(0, 6)} />);
    expect(screen.getByText('Distribution Density Shift')).toBeInTheDocument();
    expect(screen.queryByText('Baseline Mean:')).toBeNull();
  });

  it('renders CustomTooltip correctly in active and inactive states', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    const content = captured.tooltipContent as React.ReactElement<{
      active?: boolean;
      payload?: Array<{ value?: number }>;
      label?: string | number;
    }> | null;
    expect(content).not.toBeNull();
    if (!content) return;

    // Inactive returns null
    const inactive = render(React.cloneElement(content, { active: false, payload: [] }));
    expect(inactive.container).toBeEmptyDOMElement();
    inactive.unmount();

    // Active tooltip
    const activePayload = [{ value: 0.12345 }, { value: 0.05432 }];
    const activeTooltip = render(
      React.cloneElement(content, { active: true, payload: activePayload, label: '11.50' }),
    );
    expect(activeTooltip.getByText('Solve Time: 11.50s')).toBeInTheDocument();
    expect(activeTooltip.getByText('Baseline Density:')).toBeInTheDocument();
    expect(activeTooltip.getByText('0.1235')).toBeInTheDocument();
    expect(activeTooltip.getByText('Recent Density:')).toBeInTheDocument();
    expect(activeTooltip.getByText('0.0543')).toBeInTheDocument();
    activeTooltip.unmount();
  });

  it('renders mean shift banner with responsive single-column mobile and 3-column tablet/desktop classes', () => {
    const { container } = render(
      <DensityShiftChart solves={mockSolves} title="Responsive Banner Test" />,
    );

    const banner = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-3');
    expect(banner).toBeInTheDocument();
  });

  it('renders compact split sample buttons for mobile headers', () => {
    render(<DensityShiftChart solves={mockSolves} />);
    const btn20 = screen.getByRole('button', { name: '20%' });
    expect(btn20).toHaveClass('text-xs');
  });
});
