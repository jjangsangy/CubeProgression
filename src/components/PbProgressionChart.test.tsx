import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyChartTooltipAutoDismiss } from '../test/tooltipTestUtils';
import type { Solve } from '../types';
import { calculatePbProgression } from '../utils/statsMath';
import { PbProgressionChart } from './PbProgressionChart';

// Scoped Recharts mock: capture the `dot` render props and the tooltip content element the
// component actually passes down, so they can be exercised with real component data.
const captured = vi.hoisted(() => ({
  lines: [] as Array<Record<string, unknown>>,
  tooltipContent: null as React.ReactElement | null,
  tooltipActive: undefined as boolean | undefined,
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
    Legend: () => null,
    Tooltip: (props: { content?: React.ReactElement; active?: boolean }) => {
      captured.tooltipContent = props.content ?? null;
      captured.tooltipActive = props.active;
      return null;
    },
    Line: (props: Record<string, unknown>) => {
      captured.lines.push(props);
      return null;
    },
  };
});

const mockSolves: Solve[] = [
  {
    id: 1,
    index: 1,
    timeMs: 15000,
    rawTimeSec: 15.0,
    finalTimeSec: 15.0,
    penalty: 'OK',
    timestamp: 1600000000000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 2,
    index: 2,
    timeMs: 12000,
    rawTimeSec: 12.0,
    finalTimeSec: 12.0,
    penalty: 'OK',
    timestamp: 1600000100000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 3,
    index: 3,
    timeMs: 10000,
    rawTimeSec: 10.0,
    finalTimeSec: 10.0,
    penalty: 'OK',
    timestamp: 1600000200000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 4,
    index: 4,
    timeMs: 11000,
    rawTimeSec: 11.0,
    finalTimeSec: 11.0,
    penalty: 'OK',
    timestamp: 1600000300000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 5,
    index: 5,
    timeMs: 9000,
    rawTimeSec: 9.0,
    finalTimeSec: 9.0,
    penalty: 'OK',
    timestamp: 1600000400000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
];

// Enough solves to produce Single, Ao5, Ao12, Ao50 and Ao100 records
const longSolves: Solve[] = Array.from({ length: 110 }, (_, i) => ({
  id: i + 1,
  index: i + 1,
  timeMs: 20000 - i * 50,
  rawTimeSec: (20000 - i * 50) / 1000,
  finalTimeSec: (20000 - i * 50) / 1000,
  penalty: 'OK',
  timestamp: 1600000000000 + i * 1000,
  date: Temporal.PlainDate.from('2020-09-13'),
  dateStr: '2020-09-13',
}));

describe('PbProgressionChart component', () => {
  beforeEach(() => {
    captured.lines = [];
    captured.tooltipContent = null;
    captured.yAxes = [];
  });
  it('renders PB progression title and stat badges', () => {
    render(<PbProgressionChart solves={mockSolves} title="Personal Best Progression" />);

    expect(screen.getByText('Personal Best Progression')).toBeInTheDocument();
    expect(screen.getByText('PB Records')).toBeInTheDocument();
    // Best single is 9.00s
    expect(screen.getByText('9.00s')).toBeInTheDocument();
  });

  it('allows toggling all line visibility buttons', () => {
    render(<PbProgressionChart solves={mockSolves} />);

    const toggles = [
      { name: 'Single', activeClass: 'bg-amber-500/20' },
      { name: 'Ao5', activeClass: 'bg-orange-500/20' },
      { name: 'Ao12', activeClass: 'bg-sky-500/20' },
      { name: 'Ao50', activeClass: 'bg-purple-500/20' },
      { name: 'Ao100', activeClass: 'bg-emerald-500/20' },
      { name: 'Solves Overlay', activeClass: 'bg-stone-700' },
    ];

    for (const { name, activeClass } of toggles) {
      const btn = screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
      const startedActive = btn.className.includes(activeClass);

      fireEvent.click(btn);
      expect(btn.className.includes(activeClass)).toBe(!startedActive);

      fireEvent.click(btn);
      expect(btn.className.includes(activeClass)).toBe(startedActive);
    }
  });

  it('handles expanding record milestone history drawer and filtering record types', () => {
    render(<PbProgressionChart solves={longSolves} />);

    const historyBtn = screen.getByText(/Record Milestones History/i);
    fireEvent.click(historyBtn);

    const filterDrawer = screen.getByText('Filter Record Type:').parentElement;
    expect(filterDrawer).toBeInTheDocument();

    if (filterDrawer) {
      const filters = ['Single', 'Ao5', 'Ao12', 'Ao50', 'Ao100', 'All'] as const;
      for (const filter of filters) {
        const filterBtn = within(filterDrawer).getByRole('button', {
          name: new RegExp(`^${filter}$`, 'i'),
        });
        fireEvent.click(filterBtn);
        expect(filterBtn).toBeInTheDocument();
      }
    }

    // Collapse drawer
    fireEvent.click(historyBtn);
    expect(screen.queryByText(/Filter Record Type:/i)).not.toBeInTheDocument();
  });

  it('shows empty filter message when no milestones match filter category', () => {
    render(<PbProgressionChart solves={mockSolves} />);

    const historyBtn = screen.getByText(/Record Milestones History/i);
    fireEvent.click(historyBtn);

    // mockSolves has only 5 solves, so no Ao100 milestones exist
    const filterDrawer = screen.getByText('Filter Record Type:').parentElement;
    expect(filterDrawer).toBeInTheDocument();
    if (filterDrawer) {
      const ao100FilterBtn = within(filterDrawer).getByRole('button', { name: /^Ao100$/i });
      fireEvent.click(ao100FilterBtn);
    }

    expect(screen.getByText('No record milestones for this filter.')).toBeInTheDocument();
  });

  it('renders gracefully when solves array is empty', () => {
    render(<PbProgressionChart solves={[]} />);
    expect(screen.getByText('PB Progression Over Time')).toBeInTheDocument();
  });

  it('renders a highlighted dot only on solves that set a new PB record', () => {
    captured.lines.length = 0;
    render(<PbProgressionChart solves={longSolves} />);

    const series = [
      { dataKey: 'pbSingle', fill: '#f59e0b', flag: 'isNewPbSingle' },
      { dataKey: 'pbAo5', fill: '#f97316', flag: 'isNewPbAo5' },
      { dataKey: 'pbAo12', fill: '#06b6d4', flag: 'isNewPbAo12' },
      { dataKey: 'pbAo50', fill: '#8b5cf6', flag: 'isNewPbAo50' },
      { dataKey: 'pbAo100', fill: '#10b981', flag: 'isNewPbAo100' },
    ];

    for (const { dataKey, fill, flag } of series) {
      const lineProps = captured.lines.find((props) => props.dataKey === dataKey);
      expect(lineProps, `Expected a rendered Line for ${dataKey}`).toBeDefined();

      const dot = lineProps?.dot as
        | ((dotProps: {
            cx?: number;
            cy?: number;
            payload: Record<string, unknown>;
          }) => React.ReactNode)
        | undefined;
      expect(typeof dot).toBe('function');
      if (typeof dot !== 'function') continue;

      const record = render(
        <svg role="img" aria-label={`new ${dataKey} record dot`}>
          {dot({ cx: 10, cy: 20, payload: { index: 1, [flag]: true } })}
        </svg>,
      );
      const dotCircle = record.container.querySelector('circle');
      expect(dotCircle, `Expected a marker dot for a new ${dataKey} record`).not.toBeNull();
      expect(dotCircle?.getAttribute('fill')).toBe(fill);
      record.unmount();

      const noRecord = render(
        <svg role="img" aria-label={`no ${dataKey} record dot`}>
          {dot({ cx: 10, cy: 20, payload: { index: 2, [flag]: false } })}
        </svg>,
      );
      expect(noRecord.container.querySelector('circle')).toBeNull();
      noRecord.unmount();
    }
  });

  it('renders tooltip details from real progression data and renders nothing when inactive', () => {
    render(<PbProgressionChart solves={longSolves} />);

    const content = captured.tooltipContent as React.ReactElement<{
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
      label?: string | number;
    }> | null;
    expect(content).not.toBeNull();
    if (!content) return;

    // Solve #100 (index 99) sets the very first Ao100 record as well as Single/Ao5/Ao12/Ao50
    const recordPoint = calculatePbProgression(longSolves).dataPoints[99];
    const recordTooltip = render(
      React.cloneElement(content, {
        active: true,
        payload: [{ payload: recordPoint }],
        label: recordPoint.index,
      }),
    );

    const tooltip = within(recordTooltip.container);
    expect(tooltip.getByText(/New Record Set!/)).toBeInTheDocument();
    expect(tooltip.getByText(/Single, Ao5, Ao12, Ao50, Ao100/)).toBeInTheDocument();
    expect(tooltip.getByText('Solve #100')).toBeInTheDocument();
    // The solve time and the PB Single are both 15.05s here (a fresh PB)
    expect(tooltip.getAllByText('15.05s')).toHaveLength(2);
    expect(tooltip.getByText('PB Ao100:')).toBeInTheDocument();
    // Single, Ao5 and Ao50 each dropped 0.05s, Ao12 dropped 0.06s
    expect(tooltip.getAllByText('(-0.05s)')).toHaveLength(3);
    expect(tooltip.getByText('(-0.06s)')).toBeInTheDocument();
    recordTooltip.unmount();

    const inactiveTooltip = render(
      React.cloneElement(content, { active: false, payload: [], label: 1 }),
    );
    expect(inactiveTooltip.container).toBeEmptyDOMElement();
    inactiveTooltip.unmount();
  });

  it('renders PB stat summary grid with responsive 2/3/5 column classes and symmetrical 5th card', () => {
    const { container } = render(<PbProgressionChart solves={longSolves} />);

    const grid = container.querySelector('.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-5');
    expect(grid).toBeInTheDocument();

    const statCards = grid?.children;
    expect(statCards).toHaveLength(5);
    const fifthCard = statCards?.[4];
    expect(fifthCard).toHaveClass('col-span-2');
    expect(fifthCard).toHaveClass('sm:col-span-1');
  });

  it('wraps header controls with flex-wrap to prevent horizontal overflow on narrow mobile screens', () => {
    const { container } = render(<PbProgressionChart solves={longSolves} />);
    const controlsContainer = container.querySelector('.inline-flex.flex-wrap');
    expect(controlsContainer).toBeInTheDocument();
  });

  it('renders milestone cards with flex-col sm:flex-row for mobile readability and max-h-60 scroll container', () => {
    const { container } = render(<PbProgressionChart solves={longSolves} />);

    const historyBtn = screen.getByText(/Record Milestones History/i);
    fireEvent.click(historyBtn);

    const scrollContainer = container.querySelector('.max-h-60.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();

    const milestoneItem = scrollContainer?.querySelector('.flex-col.sm\\:flex-row');
    expect(milestoneItem).toBeInTheDocument();
  });

  it('renders bottom axis title and maximizes chart width with compact Y-axis on mobile portrait', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 390;
      render(<PbProgressionChart solves={mockSolves} />);

      // Bottom title is rendered on mobile portrait
      expect(screen.getByText('Personal Best Time (s)')).toBeInTheDocument();

      const yAxis = captured.yAxes[0];
      expect(yAxis?.width).toBeLessThan(40);
      expect(yAxis?.label).toBeUndefined();
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('renders standard rotated Y-axis label on desktop without bottom text', () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 1024;
      render(<PbProgressionChart solves={mockSolves} />);

      expect(screen.queryByText('Personal Best Time (s)')).not.toBeInTheDocument();

      const yAxis = captured.yAxes[0];
      expect(yAxis?.width).toBeGreaterThanOrEqual(40);
      expect(yAxis?.label?.value).toBe('Personal Best Time (seconds)');
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('updates mobile responsive state on resize and cleans up listeners on unmount', () => {
    const originalInnerWidth = window.innerWidth;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    try {
      window.innerWidth = 1024;
      const { unmount } = render(<PbProgressionChart solves={mockSolves} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(screen.queryByText('Personal Best Time (s)')).not.toBeInTheDocument();

      act(() => {
        window.innerWidth = 375;
        fireEvent(window, new Event('resize'));
      });

      expect(screen.getByText('Personal Best Time (s)')).toBeInTheDocument();

      act(() => {
        window.innerWidth = 1024;
        fireEvent(window, new Event('resize'));
      });

      expect(screen.queryByText('Personal Best Time (s)')).not.toBeInTheDocument();

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('hides PB metrics in tooltip and "New Record Set!" banner when metric toggled off', () => {
    render(<PbProgressionChart solves={mockSolves} />);

    // Initially all metrics are active
    type TooltipProps = {
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
      label?: string | number;
    };
    const tooltipEl = captured.tooltipContent as React.ReactElement<TooltipProps> | null;
    expect(tooltipEl).not.toBeNull();
    if (!tooltipEl) return;

    // Render tooltip with a data point that sets both Single and Ao5 PBs
    const pointWithMultiplePbs = {
      solveNum: 5,
      single: 12.5,
      pbSingle: 12.5,
      pbAo5: 14.2,
      isNewPbSingle: true,
      isNewPbAo5: true,
      dateStr: '2023-01-01',
      scramble: 'R U R',
    };

    const { rerender } = render(
      React.cloneElement(tooltipEl, {
        active: true,
        payload: [{ payload: pointWithMultiplePbs }],
        label: 5,
      }),
    );

    expect(screen.getByText(/PB Single:/)).toBeInTheDocument();
    expect(screen.getByText(/PB Ao5:/)).toBeInTheDocument();
    expect(screen.getByText(/New Record Set!/)).toHaveTextContent('Single, Ao5');

    // Toggle off Ao5
    const ao5Btn = screen.getByRole('button', { name: /^Ao5$/i });
    fireEvent.click(ao5Btn);

    // Re-render tooltip with the updated tooltip component from captured
    const updatedTooltipEl = captured.tooltipContent as React.ReactElement<TooltipProps>;
    rerender(
      React.cloneElement(updatedTooltipEl, {
        active: true,
        payload: [{ payload: pointWithMultiplePbs }],
        label: 5,
      }),
    );

    // Ao5 PB is now hidden and excluded from the record banner
    expect(screen.queryByText(/PB Ao5:/)).not.toBeInTheDocument();
    expect(screen.getByText(/PB Single:/)).toBeInTheDocument();
    expect(screen.getByText(/New Record Set!/)).toHaveTextContent('Single');
    expect(screen.getByText(/New Record Set!/)).not.toHaveTextContent('Ao5');
  });

  it('omits drop badges when a solve does not set a new PB', () => {
    render(<PbProgressionChart solves={mockSolves} />);
    type TooltipProps = {
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
      label?: string | number;
    };
    const tooltipEl = captured.tooltipContent as React.ReactElement<TooltipProps> | null;
    expect(tooltipEl).not.toBeNull();
    if (!tooltipEl) return;

    // Point where isNewPbSingle is false even if dropSingle has a value
    const nonPbPoint = {
      solveNum: 6,
      single: 15.0,
      pbSingle: 12.5,
      dropSingle: 2.0,
      isNewPbSingle: false,
      dateStr: '2023-01-02',
      scramble: 'R U R',
    };

    render(
      React.cloneElement(tooltipEl, {
        active: true,
        payload: [{ payload: nonPbPoint }],
        label: 6,
      }),
    );

    expect(screen.getByText(/PB Single:/)).toBeInTheDocument();
    expect(screen.queryByText(/\(-2\.00s\)/)).not.toBeInTheDocument();
  });

  it('wires touch auto-dismiss to chart container and recharts tooltip', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<PbProgressionChart solves={mockSolves} />);
      const chartSvg = container.querySelector('svg[aria-label="Mock ComposedChart"]');
      const chartWrapper = chartSvg?.parentElement;
      expect(chartWrapper).not.toBeNull();
      if (!chartWrapper) return;

      verifyChartTooltipAutoDismiss(chartWrapper, () => captured.tooltipActive);
    } finally {
      vi.useRealTimers();
    }
  });
});
