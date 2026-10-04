import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyChartTooltipAutoDismiss } from '../test/tooltipTestUtils';
import { darkTheme } from '../theme';
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
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="daily"
        title="Progression Over Solves"
      />,
    );

    const chart = container.querySelector('#progression-chart');
    expect(chart).toBeInTheDocument();
    expect(chart?.querySelector('#progression-range-selector')).toBeInTheDocument();
    expect(chart?.querySelector('#progression-muted')).toHaveAttribute('aria-pressed', 'true');
    expect(chart?.querySelector('#progression-unmuted')).toHaveAttribute('aria-pressed', 'false');
  });

  it('allows switching solve visibility modes', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const chart = container.querySelector('#progression-chart');
    const modes = [
      { mode: 'unmuted', selector: '#progression-unmuted' },
      { mode: 'dots', selector: '#progression-dots' },
      { mode: 'hidden', selector: '#progression-hidden' },
      { mode: 'muted', selector: '#progression-muted' },
    ];

    for (const { mode, selector } of modes) {
      const modeBtn = chart?.querySelector(selector);
      expect(modeBtn).toBeInTheDocument();
      fireEvent.click(modeBtn as HTMLElement);
      expect(modeBtn).toHaveAttribute('aria-pressed', 'true');

      // Exactly one visibility mode is highlighted at a time
      const activeModes = modes.filter(
        (m) => chart?.querySelector(m.selector)?.getAttribute('aria-pressed') === 'true',
      );
      expect(activeModes.map((m) => m.mode)).toEqual([mode]);
    }
  });

  it('allows toggling average lines, trend line, and custom Ao', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const chart = container.querySelector('#progression-chart');
    const toggles = [
      { selector: '#progression-ao5' },
      { selector: '#progression-ao12' },
      { selector: '#progression-ao50' },
      { selector: '#progression-ao100' },
      { selector: '#progression-trend' },
    ];

    for (const { selector } of toggles) {
      const btn = chart?.querySelector(selector);
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(btn as HTMLElement);
      expect(btn).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(btn as HTMLElement);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    }

    // Toggle Custom Ao button
    const customAoBtn = chart?.querySelector('#progression-custom-ao');
    expect(customAoBtn).toBeInTheDocument();
    expect(customAoBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(customAoBtn as HTMLElement);
    expect(customAoBtn).toHaveAttribute('aria-pressed', 'true');

    const customAoInput = chart?.querySelector('#progression-custom-ao-input');
    expect(customAoInput).toHaveValue(25);
    fireEvent.change(customAoInput as HTMLElement, { target: { value: '15' } });
    expect(customAoInput).toHaveValue(15);
    // Invalid/negative clamps to 3
    fireEvent.change(customAoInput as HTMLElement, { target: { value: '1' } });
    expect(customAoInput).toHaveValue(3);
  });

  it('handles range presets and interval mode changes', () => {
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const chart = container.querySelector('#progression-chart');

    // Apply presets and confirm the clicked preset becomes the active one
    const presetKeys = ['last50', 'last100', 'last200', 'first100', 'last7d', 'last30d', 'all'];
    for (const key of presetKeys) {
      const presetBtn = chart?.querySelector(`#range-preset-${key}`);
      expect(presetBtn).toBeInTheDocument();
      fireEvent.click(presetBtn as HTMLElement);
      expect(presetBtn).toHaveAttribute('aria-pressed', 'true');
    }

    // The active preset is painted with the app accent rather than a fixed light pill.
    expect(chart?.querySelector('#range-preset-all')).toHaveStyle({
      backgroundColor: `${darkTheme.colors.accent}30`,
    });

    // Switch to Date Range mode
    const dateRangeBtn = chart?.querySelector('#progression-date-range');
    expect(dateRangeBtn).toBeInTheDocument();
    fireEvent.click(dateRangeBtn as HTMLElement);
    expect(dateRangeBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to Solve # Interval mode
    const solveIntervalBtn = chart?.querySelector('#progression-solve-interval');
    expect(solveIntervalBtn).toBeInTheDocument();
    fireEvent.click(solveIntervalBtn as HTMLElement);
    expect(solveIntervalBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch back to All Solves mode button
    const allSolvesModeBtn = chart?.querySelector('#progression-all-solves');
    expect(allSolvesModeBtn).toBeInTheDocument();
    fireEvent.click(allSolvesModeBtn as HTMLElement);
    expect(allSolvesModeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders correctly with weekly and monthly groupingPeriod', () => {
    const { container, rerender } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="weekly"
      />,
    );
    expect(container.querySelector('#progression-range-selector')).toBeInTheDocument();

    rerender(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
        groupingPeriod="monthly"
      />,
    );
    expect(container.querySelector('#progression-range-selector')).toBeInTheDocument();
  });

  it('renders gracefully when solves array is empty', () => {
    const { container } = render(
      <ProgressionChart solves={[]} periodGroups={[]} regression={mockRegression} />,
    );
    expect(container.querySelector('#progression-chart')).toBeInTheDocument();
  });

  it('renders CustomTooltip correctly across normal, +2, DNF, and inactive states', async () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('#progression-chart-canvas')).toBeInTheDocument(),
    );

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
    const normalText = normalTooltip.container.textContent ?? '';
    expect(normalText).toContain('12.00');
    expect(normalText).toContain('11.50s');
    expect(normalText).toContain('11.80s');
    expect(normalText).toContain('R2 U2 F2');
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
    const plusTwoText = plusTwoTooltip.container.textContent ?? '';
    expect(plusTwoText).toContain('14.00s');
    expect(plusTwoText).toContain('(+2)');
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
    const dnfText = dnfTooltip.container.textContent ?? '';
    expect(dnfText).toContain('DNF');
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
    const solveIntervalBtn = container.querySelector('#progression-solve-interval');
    expect(solveIntervalBtn).toBeInTheDocument();
    fireEvent.click(solveIntervalBtn as HTMLElement);
    expect(solveIntervalBtn).toHaveAttribute('aria-pressed', 'true');

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

    // Range label should reflect the computed focused interval bounds
    const focusLabel = container.querySelector('#progression-focus-label');
    expect(focusLabel).toBeInTheDocument();
    expect(focusLabel?.textContent).toContain('#30');
    expect(focusLabel?.textContent).toContain('#90');

    // Find sliders (type="range")
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(2);
    fireEvent.change(sliders[0], { target: { value: '35' } });
    expect(fromInput).toHaveValue(35);
    fireEvent.change(sliders[1], { target: { value: '85' } });
    expect(toInput).toHaveValue(85);

    // Toggle Range Selector panel collapse and expand
    const rangeToggleBtn = container.querySelector('#progression-range-selector');
    expect(rangeToggleBtn).toBeInTheDocument();
    fireEvent.click(rangeToggleBtn as HTMLElement);
    // After collapsing, the interval controls should not be visible
    expect(container.querySelector('input[type="range"]')).toBeNull();
    fireEvent.click(rangeToggleBtn as HTMLElement);
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
    const dateRangeBtn = container.querySelector('#progression-date-range');
    expect(dateRangeBtn).toBeInTheDocument();
    fireEvent.click(dateRangeBtn as HTMLElement);
    expect(dateRangeBtn).toHaveAttribute('aria-pressed', 'true');

    // Date inputs
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: '2020-10-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2020-10-20' } });

    // Reset button should now be visible since range is filtered
    const resetBtn = container.querySelector('#progression-reset-range');
    expect(resetBtn).toBeInTheDocument();

    // Click Reset button to return to all solves
    fireEvent.click(resetBtn as HTMLElement);
    expect(container.querySelector('#progression-reset-range')).toBeNull();
  });

  it('renders period boundary reference line label callback', async () => {
    render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('#progression-chart-canvas')).toBeInTheDocument(),
    );

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
    const { container } = render(
      <ProgressionChart
        solves={mockSolves}
        periodGroups={mockPeriodGroups}
        regression={mockRegression}
      />,
    );

    const solveIntervalBtn = container.querySelector('#progression-solve-interval');
    expect(solveIntervalBtn).toBeInTheDocument();
    fireEvent.click(solveIntervalBtn as HTMLElement);

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

    const solveIntervalBtn = container.querySelector('#progression-solve-interval');
    expect(solveIntervalBtn).toBeInTheDocument();
    fireEvent.click(solveIntervalBtn as HTMLElement);

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

    const dateRangeBtn = container.querySelector('#progression-date-range');
    expect(dateRangeBtn).toBeInTheDocument();
    fireEvent.click(dateRangeBtn as HTMLElement);

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
      await waitFor(() =>
        expect(document.querySelector('#progression-chart-canvas')).toBeInTheDocument(),
      );
      expect(document.querySelector('#progression-mobile-axis-title')).toBeInTheDocument();
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
      // Canvas is not mounted while the idle callback is pending
      expect(document.querySelector('#progression-chart-canvas')).toBeNull();

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

      await waitFor(() =>
        expect(document.querySelector('#progression-chart-canvas')).toBeInTheDocument(),
      );

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

      await waitFor(() =>
        expect(document.querySelector('#progression-chart-canvas')).toBeInTheDocument(),
      );

      expect(document.querySelector('#progression-mobile-axis-title')).toBeNull();

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
      const { container } = render(
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

      const canvas = container.querySelector('#progression-chart-canvas') as HTMLElement;
      expect(canvas).toBeInTheDocument();

      verifyChartTooltipAutoDismiss(canvas, () => captured.tooltipActive);
    } finally {
      vi.useRealTimers();
    }
  });
});
