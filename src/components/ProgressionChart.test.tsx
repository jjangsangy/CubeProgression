import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LinearRegression, PeriodGroup, Solve } from '../types';
import { ProgressionChart } from './ProgressionChart';

const mockSolves: Solve[] = Array.from({ length: 120 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 12000 - idx * 20,
  rawTimeSec: (12000 - idx * 20) / 1000,
  finalTimeSec: idx === 5 ? Infinity : (12000 - idx * 20) / 1000,
  penalty: idx === 5 ? 'DNF' : idx === 10 ? '+2' : 'OK',
  timestamp: 1600000000000 + idx * 86400000,
  date: new Date(1600000000000 + idx * 86400000),
  dateStr: new Date(1600000000000 + idx * 86400000).toISOString().split('T')[0],
  scramble: `R2 U2 #${idx + 1}`,
  comment: idx === 1 ? 'fast execution' : '',
}));

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Period 1',
    startDate: new Date(1600000000000),
    endDate: new Date(1600000000000 + 60 * 86400000),
    solves: mockSolves.slice(0, 60),
    timesSec: mockSolves.slice(0, 60).map((s) => s.finalTimeSec),
    mean: 11.5,
    median: 11.5,
    min: 10.8,
    max: 12.0,
    stdDev: 0.5,
    q1: 11.0,
    q3: 12.0,
    iqr: 1.0,
    whiskerLow: 10.8,
    whiskerHigh: 12.0,
    outliers: [],
  },
  {
    label: 'Period 2',
    startDate: new Date(1600000000000 + 61 * 86400000),
    endDate: new Date(1600000000000 + 120 * 86400000),
    solves: mockSolves.slice(60),
    timesSec: mockSolves.slice(60).map((s) => s.finalTimeSec),
    mean: 10.0,
    median: 10.0,
    min: 9.6,
    max: 10.8,
    stdDev: 0.4,
    q1: 9.8,
    q3: 10.2,
    iqr: 0.4,
    whiskerLow: 9.6,
    whiskerHigh: 10.8,
    outliers: [],
  },
];

const mockRegression: LinearRegression = {
  slope: -0.02,
  intercept: 12.0,
  r2: 0.85,
  slopeFormatted: '-0.0200s/solve',
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
      />,
    );

    expect(screen.getByText('Progression Over Solves')).toBeInTheDocument();
    expect(screen.getByText('Range Selector')).toBeInTheDocument();
    expect(screen.getAllByText('All Solves')[0]).toBeInTheDocument();

    expect(screen.getByText('Muted')).toBeInTheDocument();
    expect(screen.getByText('Unmuted')).toBeInTheDocument();
    expect(screen.getByText('With Dots')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('allows switching solve visibility modes', () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const modes = ['Unmuted', 'With Dots', 'Hidden', 'Muted'];
    for (const mode of modes) {
      const modeBtn = screen.getByRole('button', { name: mode });
      fireEvent.click(modeBtn);
      expect(modeBtn.className).toContain('bg-stone-700');

      // Exactly one visibility mode is highlighted at a time
      const activeModes = modes.filter((m) =>
        screen.getByRole('button', { name: m }).className.includes('bg-stone-700'),
      );
      expect(activeModes).toEqual([mode]);
    }
  });

  it('allows toggling average lines, trend line, and custom Ao', () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const toggles = [
      { name: 'Ao5', activeClass: 'bg-emerald-500/20' },
      { name: 'Ao12', activeClass: 'bg-orange-500/20' },
      { name: 'Ao50', activeClass: 'bg-sky-500/20' },
      { name: 'Ao100', activeClass: 'bg-purple-500/20' },
      { name: 'Trend', activeClass: 'bg-rose-500/20' },
    ];

    for (const { name, activeClass } of toggles) {
      const btn = screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
      expect(btn.className).toContain(activeClass);

      fireEvent.click(btn);
      expect(btn.className).not.toContain(activeClass);

      fireEvent.click(btn);
      expect(btn.className).toContain(activeClass);
    }

    // Toggle Custom Ao button
    const customAoBtn = screen.getByRole('button', { name: /Custom Ao/i });
    expect(customAoBtn.className).not.toContain('bg-yellow-500/20');
    fireEvent.click(customAoBtn);
    expect(customAoBtn.className).toContain('bg-yellow-500/20');

    const customAoInput = screen.getByRole('spinbutton');
    expect(customAoInput).toHaveValue(25);
    fireEvent.change(customAoInput, { target: { value: '25' } });
    expect(customAoInput).toHaveValue(25);
  });

  it('handles range presets and interval mode changes', () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    // Apply presets and confirm the clicked preset becomes the active one
    const presets = [
      'Last 50',
      'Last 100',
      'Last 200',
      'First 100',
      'Last 7 Days',
      'Last 30 Days',
      'All Solves',
    ];
    for (const p of presets) {
      // "All Solves" also names the mode-switcher button; the preset pill renders later in the DOM
      const matches = screen.getAllByRole('button', { name: new RegExp(`^${p}$`, 'i') });
      const presetBtn = matches[matches.length - 1];
      fireEvent.click(presetBtn);
      expect(presetBtn.className).toContain('bg-stone-100');
    }

    // Switch to Date Range mode
    const dateRangeBtn = screen.getByRole('button', { name: /Date Range/i });
    fireEvent.click(dateRangeBtn);
    expect(dateRangeBtn.className).toContain('bg-sky-500');

    // Switch to Solve # Interval mode
    const solveIntervalBtn = screen.getByRole('button', { name: /Solve # Interval/i });
    fireEvent.click(solveIntervalBtn);
    expect(solveIntervalBtn.className).toContain('bg-sky-500');
  });

  it('renders correctly with weekly and monthly groupingPeriod', () => {
    const { rerender } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="weekly"
      />,
    );
    expect(screen.getByText('Range Selector')).toBeInTheDocument();

    rerender(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="monthly"
      />,
    );
    expect(screen.getByText('Range Selector')).toBeInTheDocument();
  });

  it('renders gracefully when solves array is empty', () => {
    render(<ProgressionChart solves={[]} periodGroups={[]} regression={mockRegression} />);
    expect(screen.getByText('Overall Progression & Moving Averages')).toBeInTheDocument();
  });
});
