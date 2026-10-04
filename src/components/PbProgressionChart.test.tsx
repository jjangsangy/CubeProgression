import { act, fireEvent, render } from '@testing-library/react';
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
        <svg id="mock-composed-chart" role="img" aria-label="Mock ComposedChart">
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
    const { container } = render(
      <PbProgressionChart solves={mockSolves} title="Personal Best Progression" />,
    );

    const chart = container.querySelector('#pb-progression-chart');
    expect(chart).toBeInTheDocument();
    // The card heading reflects the title prop passed in
    expect(chart?.querySelector('h2')?.textContent).toContain('Personal Best Progression');

    const summaryGrid = chart?.querySelector('.grid');
    expect(summaryGrid).toBeInTheDocument();
    // 5 PB summary cards (Single, Ao5, Ao12, Ao50, Ao100)
    expect(summaryGrid?.children).toHaveLength(5);
    // The fixture's fastest single (9.0s) is the current PB Single readout
    expect(summaryGrid?.textContent).toContain('9.00s');
  });

  it('allows toggling all line visibility buttons', () => {
    const { container } = render(<PbProgressionChart solves={mockSolves} />);

    const controls = container.querySelector('#pb-metric-toggles');
    expect(controls).toBeInTheDocument();
    const buttons = controls ? Array.from(controls.querySelectorAll('button')) : [];

    // Single, Ao5, Ao12, Ao50, Ao100 line toggles plus the Solves Overlay toggle
    const activeClasses = [
      'bg-amber-500/20',
      'bg-orange-500/20',
      'bg-sky-500/20',
      'bg-purple-500/20',
      'bg-emerald-500/20',
      'bg-stone-700',
    ];
    expect(buttons).toHaveLength(activeClasses.length);

    buttons.forEach((btn, index) => {
      const activeClass = activeClasses[index];
      const startedActive = btn.className.includes(activeClass);

      fireEvent.click(btn);
      expect(btn.className.includes(activeClass)).toBe(!startedActive);
      expect(btn).toHaveAttribute('aria-pressed', String(!startedActive));

      fireEvent.click(btn);
      expect(btn.className.includes(activeClass)).toBe(startedActive);
      expect(btn).toHaveAttribute('aria-pressed', String(startedActive));
    });
  });

  it('handles expanding record milestone history drawer and filtering record types', () => {
    const { container } = render(<PbProgressionChart solves={longSolves} />);

    const historyBtn = container.querySelector('#pb-milestones-history-toggle');
    expect(historyBtn).toBeInTheDocument();
    if (!historyBtn) return;
    fireEvent.click(historyBtn);

    const filterDrawer = container.querySelector('#pb-milestones-filters');
    expect(filterDrawer).toBeInTheDocument();

    if (filterDrawer) {
      const filterBtns = Array.from(filterDrawer.querySelectorAll('button'));
      expect(filterBtns).toHaveLength(6);
      for (const filterBtn of filterBtns) {
        fireEvent.click(filterBtn);
        expect(filterBtn).toHaveAttribute('aria-pressed', 'true');
      }
    }

    // Collapse drawer
    fireEvent.click(historyBtn);
    expect(container.querySelector('#pb-milestones-filters')).toBeNull();
  });

  it('shows empty state when no milestones match filter category', () => {
    const { container } = render(<PbProgressionChart solves={mockSolves} />);

    const historyBtn = container.querySelector('#pb-milestones-history-toggle');
    expect(historyBtn).toBeInTheDocument();
    if (!historyBtn) return;
    fireEvent.click(historyBtn);

    // mockSolves has only 5 solves, so no Ao100 milestones exist
    const filterDrawer = container.querySelector('#pb-milestones-filters');
    expect(filterDrawer).toBeInTheDocument();
    if (filterDrawer) {
      const filterBtns = Array.from(filterDrawer.querySelectorAll('button'));
      expect(filterBtns).toHaveLength(6);
      // Ao100 is the sixth filter button; selecting it yields no matching milestones
      const ao100FilterBtn = filterBtns[5];
      fireEvent.click(ao100FilterBtn);
      expect(ao100FilterBtn).toHaveAttribute('aria-pressed', 'true');
    }

    // No matching milestones renders the empty-state branch with a single <p> and zero rows
    const scrollContainer = container.querySelector('.max-h-60.overflow-y-auto');
    expect(scrollContainer).not.toBeNull();
    if (!scrollContainer) return;
    expect(scrollContainer.children).toHaveLength(1);
    expect(scrollContainer.children[0].tagName).toBe('P');
  });

  it('renders gracefully when solves array is empty', () => {
    const { container } = render(<PbProgressionChart solves={[]} />);

    const chart = container.querySelector('#pb-progression-chart');
    expect(chart).toBeInTheDocument();
    expect(chart?.querySelector('h2')).toBeInTheDocument();
  });

  it('renders a highlighted dot only on solves that set a new PB record', () => {
    captured.lines.length = 0;
    render(<PbProgressionChart solves={longSolves} />);

    const series = [
      { dataKey: 'pbSingle', fill: '#eab308', flag: 'isNewPbSingle' },
      { dataKey: 'pbAo5', fill: '#f97316', flag: 'isNewPbAo5' },
      { dataKey: 'pbAo12', fill: '#14b8a6', flag: 'isNewPbAo12' },
      { dataKey: 'pbAo50', fill: '#a855f7', flag: 'isNewPbAo50' },
      { dataKey: 'pbAo100', fill: '#22c55e', flag: 'isNewPbAo100' },
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

    const tooltipText = recordTooltip.container.textContent ?? '';
    expect(tooltipText).toContain('New Record Set!');
    expect(tooltipText).toContain('Single, Ao5, Ao12, Ao50, Ao100');
    expect(tooltipText).toContain('Solve #100');
    // The solve time and the PB Single are both 15.05s here (a fresh PB)
    expect(tooltipText.match(/15\.05s/g) ?? []).toHaveLength(2);
    // The PB Ao100 readout renders its computed value
    expect(recordPoint.pbAo100).not.toBeNull();
    expect(tooltipText).toContain(`${recordPoint.pbAo100?.toFixed(2)}s`);
    // Single, Ao5 and Ao50 each dropped 0.05s, Ao12 dropped 0.06s
    expect(tooltipText.match(/\(-0\.05s\)/g) ?? []).toHaveLength(3);
    expect(tooltipText).toContain('(-0.06s)');
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

    const historyBtn = container.querySelector('#pb-milestones-history-toggle');
    expect(historyBtn).toBeInTheDocument();
    if (!historyBtn) return;
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
      const { container } = render(<PbProgressionChart solves={mockSolves} />);

      // Bottom axis title region is rendered on mobile portrait
      expect(container.querySelector('#pb-mobile-axis-title')).toBeInTheDocument();

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
      const { container } = render(<PbProgressionChart solves={mockSolves} />);

      expect(container.querySelector('#pb-mobile-axis-title')).toBeNull();

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
      const { container, unmount } = render(<PbProgressionChart solves={mockSolves} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(container.querySelector('#pb-mobile-axis-title')).toBeNull();

      act(() => {
        window.innerWidth = 375;
        fireEvent(window, new Event('resize'));
      });

      expect(container.querySelector('#pb-mobile-axis-title')).toBeInTheDocument();

      act(() => {
        window.innerWidth = 1024;
        fireEvent(window, new Event('resize'));
      });

      expect(container.querySelector('#pb-mobile-axis-title')).toBeNull();

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    } finally {
      window.innerWidth = originalInnerWidth;
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });

  it('hides PB metrics in tooltip and "New Record Set!" banner when metric toggled off', () => {
    const { container: chartContainer } = render(<PbProgressionChart solves={mockSolves} />);

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

    const { container: tooltipContainer, rerender } = render(
      React.cloneElement(tooltipEl, {
        active: true,
        payload: [{ payload: pointWithMultiplePbs }],
        label: 5,
      }),
    );

    const beforeText = tooltipContainer.textContent ?? '';
    expect(beforeText).toContain('12.50s'); // PB Single readout
    expect(beforeText).toContain('14.20s'); // PB Ao5 readout
    expect(beforeText).toContain('Single, Ao5');

    // Toggle off the Ao5 metric line (second button in the metrics toolbar)
    const controls = chartContainer.querySelector('#pb-metric-toggles');
    expect(controls).toBeInTheDocument();
    const metricButtons = controls ? Array.from(controls.querySelectorAll('button')) : [];
    expect(metricButtons).toHaveLength(6);
    const ao5Btn = metricButtons[1];
    fireEvent.click(ao5Btn);
    expect(ao5Btn).toHaveAttribute('aria-pressed', 'false');

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
    const afterText = tooltipContainer.textContent ?? '';
    expect(afterText).toContain('12.50s');
    expect(afterText).not.toContain('14.20s');
    expect(afterText).toContain('Single');
    expect(afterText).not.toMatch(/\bAo5\b/);
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

    const { container: tooltipContainer } = render(
      React.cloneElement(tooltipEl, {
        active: true,
        payload: [{ payload: nonPbPoint }],
        label: 6,
      }),
    );

    const tooltipText = tooltipContainer.textContent ?? '';
    expect(tooltipText).toContain('12.50s'); // PB Single readout is still shown
    expect(tooltipText).toContain('15.00s'); // Solve time
    expect(tooltipText).not.toContain('(-2.00s)'); // No drop badge for a non-PB solve
  });

  it('wires touch auto-dismiss to chart container and recharts tooltip', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<PbProgressionChart solves={mockSolves} />);
      const chartSvg = container.querySelector('#mock-composed-chart');
      const chartWrapper = chartSvg?.parentElement;
      expect(chartWrapper).not.toBeNull();
      if (!chartWrapper) return;

      verifyChartTooltipAutoDismiss(chartWrapper, () => captured.tooltipActive);
    } finally {
      vi.useRealTimers();
    }
  });
});
