import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyChartTooltipAutoDismiss } from '../test/tooltipTestUtils';
import type { LinearRegression, PeriodGroup, Solve } from '../types';
import { ProgressionChart } from './ProgressionChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
  tooltipActive: undefined as boolean | undefined,
  referenceLineLabels: [] as Array<(props: unknown) => React.ReactNode>,
  yAxes: [] as Array<{
    width?: number;
    fontSize?: number;
    label?: {
      value?: string;
      offset?: number;
      fontSize?: number;
    };
  }>,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    ComposedChart: (props: {
      children: React.ReactNode;
      margin?: { top: number; right: number; left: number; bottom: number };
    }) => {
      return (
        <svg role="img" aria-label="Mock ComposedChart">
          {props.children}
        </svg>
      );
    },
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: (props: {
      width?: number;
      fontSize?: number;
      label?: {
        value?: string;
        offset?: number;
        fontSize?: number;
      };
    }) => {
      captured.yAxes.push(props);
      return null;
    },
    Legend: (props: { content?: React.ReactElement }) => props.content ?? null,
    Tooltip: (props: { content?: React.ReactElement; active?: boolean }) => {
      captured.tooltipContent = props.content ?? null;
      captured.tooltipActive = props.active;
      return null;
    },
    ReferenceLine: (props: { label?: (props: unknown) => React.ReactNode }) => {
      if (typeof props.label === 'function') {
        captured.referenceLineLabels.push(props.label);
      }
      return null;
    },
  };
});

const mockSolves: Solve[] = Array.from({ length: 120 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 12000 - idx * 20,
  rawTimeSec: (12000 - idx * 20) / 1000,
  finalTimeSec: idx === 5 ? Infinity : (12000 - idx * 20) / 1000,
  penalty: idx === 5 ? 'DNF' : idx === 10 ? '+2' : 'OK',
  timestamp: 1600000000000 + idx * 86400000,
  date: Temporal.Instant.fromEpochMilliseconds(1600000000000 + idx * 86400000)
    .toZonedDateTimeISO('UTC')
    .toPlainDate(),
  dateStr: Temporal.Instant.fromEpochMilliseconds(1600000000000 + idx * 86400000)
    .toZonedDateTimeISO('UTC')
    .toPlainDate()
    .toString(),
  scramble: `R2 U2 #${idx + 1}`,
  comment: idx === 1 ? 'fast execution' : '',
}));

const mockPeriodGroups: PeriodGroup[] = [
  {
    label: 'Period 1',
    startDate: Temporal.PlainDate.from('2020-09-13'),
    endDate: Temporal.PlainDate.from('2020-11-12'),
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
    startDate: Temporal.PlainDate.from('2020-11-13'),
    endDate: Temporal.PlainDate.from('2021-01-11'),
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
  beforeEach(() => {
    captured.yAxes = [];
    captured.referenceLineLabels = [];
    captured.tooltipContent = null;
  });
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
    fireEvent.change(customAoInput, { target: { value: '15' } });
    expect(customAoInput).toHaveValue(15);
    // Invalid/negative clamps to 3
    fireEvent.change(customAoInput, { target: { value: '1' } });
    expect(customAoInput).toHaveValue(3);
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

    // Switch back to All Solves mode button
    const allSolvesModeBtn = screen.getAllByRole('button', { name: /All Solves/i })[0];
    fireEvent.click(allSolvesModeBtn);
    expect(allSolvesModeBtn.className).toContain('bg-sky-500');
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

  it('renders CustomTooltip correctly across normal, +2, DNF, and inactive states', async () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    await screen.findByTestId('progression-chart-canvas');

    const content = captured.tooltipContent as React.ReactElement<{
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
      label?: string | number;
    }> | null;
    expect(content).not.toBeNull();
    if (!content) return;

    // Inactive tooltip returns null
    const inactive = render(React.cloneElement(content, { active: false, payload: [] }));
    expect(inactive.container).toBeEmptyDOMElement();
    inactive.unmount();

    // Normal solve point
    const normalPayload = [
      {
        payload: {
          index: 1,
          single: 12.0,
          ao5: 11.5,
          ao12: 11.8,
          trend: 12.0,
          dateStr: '2020-09-13',
          scramble: 'R2 U2 F2',
          penalty: 'OK',
          periodLabel: 'Period 1',
        },
      },
    ];
    const normalTooltip = render(
      React.cloneElement(content, { active: true, payload: normalPayload, label: 1 }),
    );
    expect(normalTooltip.getByText('Solve #1')).toBeInTheDocument();
    expect(normalTooltip.getByText('(Period 1)')).toBeInTheDocument();
    expect(normalTooltip.getAllByText(/12\.00/)[0]).toBeInTheDocument();
    expect(normalTooltip.getByText('11.50s')).toBeInTheDocument();
    expect(normalTooltip.getByText('11.80s')).toBeInTheDocument();
    expect(normalTooltip.getByText(/Scramble: R2 U2 F2/)).toBeInTheDocument();
    normalTooltip.unmount();

    // +2 solve point
    const plusTwoPayload = [
      {
        payload: {
          index: 10,
          single: 14.0,
          dateStr: '2020-09-23',
          penalty: '+2',
        },
      },
    ];
    const plusTwoTooltip = render(
      React.cloneElement(content, { active: true, payload: plusTwoPayload, label: 10 }),
    );
    expect(plusTwoTooltip.getByText('14.00s')).toBeInTheDocument();
    expect(plusTwoTooltip.getByText('(+2)')).toBeInTheDocument();
    plusTwoTooltip.unmount();

    // DNF solve point (verifying single time DNF is displayed)
    const dnfPayload = [
      {
        payload: {
          index: 6,
          single: null,
          dateStr: '2020-09-19',
          penalty: 'DNF',
        },
      },
    ];
    const dnfTooltip = render(
      React.cloneElement(content, { active: true, payload: dnfPayload, label: 6 }),
    );
    expect(dnfTooltip.getByText('DNF')).toBeInTheDocument();
    dnfTooltip.unmount();
  });

  it('handles solve interval inputs, sliders, and range panel toggling', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    // Switch to Solve # Interval mode
    const solveIntervalBtn = screen.getByRole('button', { name: /Solve # Interval/i });
    fireEvent.click(solveIntervalBtn);

    // Find "From Solve #" and "To Solve #" number inputs
    const numberInputs = Array.from(container.querySelectorAll('input[type="number"]'));
    // The first is From Solve #, the second is To Solve #
    const fromInput = numberInputs[numberInputs.length - 2];
    const toInput = numberInputs[numberInputs.length - 1];

    // Change start solve number
    fireEvent.change(fromInput, { target: { value: '30' } });
    expect(fromInput).toHaveValue(30);

    // Change end solve number
    fireEvent.change(toInput, { target: { value: '90' } });
    expect(toInput).toHaveValue(90);

    // Range stats banner should update
    expect(screen.getByText(/Solves #30/)).toBeInTheDocument();

    // Find sliders (type="range")
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(2);
    fireEvent.change(sliders[0], { target: { value: '35' } });
    expect(fromInput).toHaveValue(35);
    fireEvent.change(sliders[1], { target: { value: '85' } });
    expect(toInput).toHaveValue(85);

    // Toggle Range Selector panel collapse and expand
    const rangeToggleBtn = screen.getByRole('button', { name: /Range Selector/i });
    fireEvent.click(rangeToggleBtn);
    // After collapsing, the interval controls should not be visible
    expect(container.querySelector('input[type="range"]')).toBeNull();
    fireEvent.click(rangeToggleBtn);
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
  });

  it('handles date range filtering and Reset Range button', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    // Switch to Date Range mode
    const dateRangeBtn = screen.getByRole('button', { name: /Date Range/i });
    fireEvent.click(dateRangeBtn);

    // Date inputs
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: '2020-10-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2020-10-20' } });

    // Reset button should now be visible since range is filtered
    const resetBtn = screen.getByRole('button', { name: /Reset Range/i });
    expect(resetBtn).toBeInTheDocument();

    // Click Reset button to return to all solves
    fireEvent.click(resetBtn);
    expect(screen.queryByRole('button', { name: /Reset Range/i })).toBeNull();
  });

  it('renders period boundary reference line label callback', async () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    await screen.findByTestId('progression-chart-canvas');

    expect(captured.referenceLineLabels.length).toBeGreaterThan(0);
    const labelFn = captured.referenceLineLabels[0];

    // With valid viewBox
    const rendered = render(
      <svg role="img" aria-label="Reference line label test">
        {labelFn({ viewBox: { x: 100, y: 50 } }) as React.ReactElement}
      </svg>,
    );
    expect(rendered.container.querySelector('text')).not.toBeNull();
    rendered.unmount();

    // Without viewBox
    expect(labelFn({})).toBeNull();
  });

  it('applies touchAction pan-x to solve range sliders for mobile gesture compatibility', () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const solveIntervalBtn = screen.getByRole('button', { name: /Solve # Interval/i });
    fireEvent.click(solveIntervalBtn);

    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveStyle({ touchAction: 'pan-x' });
    expect(sliders[1]).toHaveStyle({ touchAction: 'pan-x' });
  });

  it('renders slider container with responsive flex-col md:flex-row layout', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const solveIntervalBtn = screen.getByRole('button', { name: /Solve # Interval/i });
    fireEvent.click(solveIntervalBtn);

    const sliderGroup = container.querySelector('.flex-col.md\\:flex-row');
    expect(sliderGroup).toBeInTheDocument();
  });

  it('clamps date range inputs to earliest and latest dates in dataset', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const dateRangeBtn = screen.getByRole('button', { name: /Date Range/i });
    fireEvent.click(dateRangeBtn);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs[0]).toHaveAttribute('min', mockSolves[0].dateStr);
    expect(dateInputs[1]).toHaveAttribute('max', mockSolves[mockSolves.length - 1].dateStr);
  });

  it('initializes mobile screen state synchronously from window.innerWidth', async () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 375;
      render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );
      expect(await screen.findByTestId('progression-chart-canvas')).toBeInTheDocument();
      expect(screen.getByText('Time (s)')).toBeInTheDocument();
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('schedules canvas mounting via requestIdleCallback and cancels on unmount', () => {
    const cancelMock = vi.fn();
    const requestMock = vi.fn(() => 42);

    const win = window as unknown as {
      requestIdleCallback?: typeof requestMock;
      cancelIdleCallback?: typeof cancelMock;
    };
    win.requestIdleCallback = requestMock;
    win.cancelIdleCallback = cancelMock;

    try {
      const { unmount } = render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );

      expect(requestMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 1200 });
      expect(screen.getByTestId('progression-canvas-skeleton')).toBeInTheDocument();

      unmount();
      expect(cancelMock).toHaveBeenCalledWith(42);
    } finally {
      delete win.requestIdleCallback;
      delete win.cancelIdleCallback;
    }
  });

  it('updates responsive dimensions on window resize event and cleans up listener on unmount', () => {
    const originalInnerWidth = window.innerWidth;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    try {
      window.innerWidth = 1024;
      const { unmount } = render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      act(() => {
        window.innerWidth = 500;
        fireEvent(window, new Event('resize'));
      });

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('renders bottom axis title and maximizes chart width with compact Y-axis on mobile portrait', async () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );

      await screen.findByTestId('progression-chart-canvas');

      expect(screen.getByText('Time (s)')).toBeInTheDocument();

      const yAxis = captured.yAxes[0];
      expect(yAxis?.width).toBeLessThan(40);
      expect(yAxis?.label).toBeUndefined();
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders standard rotated Y-axis label on desktop without bottom text', async () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 1024;
      render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );

      await screen.findByTestId('progression-chart-canvas');

      expect(screen.queryByText('Time (s)')).not.toBeInTheDocument();

      const yAxis = captured.yAxes[0];
      expect(yAxis?.width).toBeGreaterThanOrEqual(40);
      expect(yAxis?.label?.value).toBe('Time (seconds)');
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('wires touch auto-dismiss to chart canvas container and recharts tooltip', () => {
    vi.useFakeTimers();
    try {
      render(
        <ProgressionChart
          solves={mockSolves}
          periodGroups={mockPeriodGroups}
          regression={mockRegression}
        />,
      );

      // Advance timers to mount deferred canvas
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const canvas = screen.getByTestId('progression-chart-canvas');
      expect(canvas).toBeInTheDocument();

      verifyChartTooltipAutoDismiss(canvas, () => captured.tooltipActive);
    } finally {
      vi.useRealTimers();
    }
  });
});
