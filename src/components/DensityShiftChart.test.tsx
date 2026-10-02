import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Solve } from '../types';
import { DensityShiftChart } from './DensityShiftChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
  chartData: null as Array<{ x: number; baselineDensity: number; recentDensity: number }> | null,
  yAxisProps: null as { domain?: [number, number]; width?: number } | null,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    AreaChart: ({
      children,
      data,
    }: {
      children: React.ReactNode;
      data?: Array<{ x: number; baselineDensity: number; recentDensity: number }>;
    }) => {
      captured.chartData = data ?? null;
      return (
        <svg role="img" aria-label="Mock AreaChart">
          {children}
        </svg>
      );
    },
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: (props: { domain?: [number, number]; width?: number }) => {
      captured.yAxisProps = props;
      return null;
    },
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

  it('renders mean shift banner with centered symmetrical 3-column classes', () => {
    const { container } = render(
      <DensityShiftChart solves={mockSolves} title="Responsive Banner Test" />,
    );

    const banner = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-3');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('sm:divide-x');
  });

  it('renders scrubbers on track with opacity, ribbed resize handles, and dataset sparkline', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
    expect(track).toBeInTheDocument();

    const scrubber1 = screen.getByLabelText('Baseline scrubber position');
    const scrubber2 = screen.getByLabelText('Recent scrubber position');

    expect(scrubber1).toBeInTheDocument();
    expect(scrubber2).toBeInTheDocument();

    // Verify opacity classes
    expect(scrubber1).toHaveClass('bg-rose-500/25');
    expect(scrubber2).toHaveClass('bg-emerald-500/25');

    // Verify ribbed resize handles
    expect(screen.getByLabelText('Baseline left resize handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Baseline right resize handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent left resize handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent right resize handle')).toBeInTheDocument();

    // Verify no ugly "Sample 1" or "Sample 2" text labels inside scrubbers
    expect(screen.queryByText(/Sample 1:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sample 2:/)).not.toBeInTheDocument();

    // Verify dataset visual representation inside the track
    const sparklineSvg = track.querySelector('svg');
    expect(sparklineSvg).toBeInTheDocument();
  });

  it('maintains symmetry: resizing one scrubber updates the other scrubber by the exact same amount', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    const scrubber1 = screen.getByLabelText('Baseline scrubber position');
    const scrubber2 = screen.getByLabelText('Recent scrubber position');

    // Both start at default 30% of 20 = 6 solves -> 30% width
    expect(scrubber1.style.width).toBe('30%');
    expect(scrubber2.style.width).toBe('30%');

    // Resize Scrubber 1 (Alt+ArrowRight expands width by 1 solve)
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight', altKey: true });

    // Symmetrical: both scrubbers expand to 7 solves -> 35% width
    expect(scrubber1.style.width).toBe('35%');
    expect(scrubber2.style.width).toBe('35%');
    expect(screen.getByText('(#1–#7)')).toBeInTheDocument();
    expect(screen.getByText('(#14–#20)')).toBeInTheDocument();

    // Resize Scrubber 2 (Alt+ArrowLeft shrinks width by 1 solve)
    fireEvent.keyDown(scrubber2, { key: 'ArrowLeft', altKey: true });

    // Symmetrical: both scrubbers shrink back to 6 solves -> 30% width
    expect(scrubber1.style.width).toBe('30%');
    expect(scrubber2.style.width).toBe('30%');
    expect(screen.getByText('(#1–#6)')).toBeInTheDocument();
    expect(screen.getByText('(#14–#19)')).toBeInTheDocument();
  });

  it('allows sliding scrubbers across the distribution using keyboard navigation', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    const scrubber1 = screen.getByLabelText('Baseline scrubber position');
    // Initial value is 1 (index 0 + 1)
    expect(scrubber1).toHaveAttribute('aria-valuenow', '1');

    // Nudge right
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
    expect(scrubber1).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText('(#2–#7)')).toBeInTheDocument();

    // Nudge left
    fireEvent.keyDown(scrubber1, { key: 'ArrowLeft' });
    expect(scrubber1).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('(#1–#6)')).toBeInTheDocument();
  });

  it('keeps X-axis domain completely stable and fluid when scrubbers slide to eliminate jitter', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    const scrubber1 = screen.getByLabelText('Baseline scrubber position');
    expect(captured.chartData).not.toBeNull();
    const initialXPoints = captured.chartData?.map((p) => p.x);

    // Slide scrubber position across multiple solves
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });

    const newXPoints = captured.chartData?.map((p) => p.x);

    // Every single x-evaluation point on the X axis is identical — zero jitter
    expect(newXPoints).toEqual(initialXPoints);
  });

  it('normalizes Y-axis domain proportionally when scrubber size changes so peaks are neither too small nor too large', () => {
    render(<DensityShiftChart solves={mockSolves} />);

    expect(captured.yAxisProps).not.toBeNull();
    const initialDomain = captured.yAxisProps?.domain;
    expect(initialDomain).toBeDefined();
    expect(initialDomain?.[0]).toBe(0);
    const initialCeiling = initialDomain?.[1] ?? 0;

    // Peak density is roughly 70-80% of the ceiling
    const maxDensity = Math.max(
      ...(captured.chartData?.map((p) => Math.max(p.baselineDensity, p.recentDensity)) ?? [0]),
    );
    expect(maxDensity / initialCeiling).toBeGreaterThanOrEqual(0.65);
    expect(maxDensity / initialCeiling).toBeLessThanOrEqual(0.85);

    // Expand scrubber window (Alt+ArrowRight 4 times)
    const scrubber1 = screen.getByLabelText('Baseline scrubber position');
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(scrubber1, { key: 'ArrowRight', altKey: true });

    // The Y ceiling normalizes dynamically to the new peak density
    const newDomain = captured.yAxisProps?.domain;
    expect(newDomain).toBeDefined();
    const newCeiling = newDomain?.[1] ?? 0;
    const newMaxDensity = Math.max(
      ...(captured.chartData?.map((p) => Math.max(p.baselineDensity, p.recentDensity)) ?? [0]),
    );
    expect(newMaxDensity / newCeiling).toBeGreaterThanOrEqual(0.65);
    expect(newMaxDensity / newCeiling).toBeLessThanOrEqual(0.85);
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
});
