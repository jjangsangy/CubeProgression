import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Solve } from '../types';
import { DensityShiftChart } from './DensityShiftChart';

const captured = vi.hoisted(() => ({
  tooltipContent: null as React.ReactElement | null,
  chartData: null as Array<{ x: number; baselineDensity: number; recentDensity: number }> | null,
  chartProps: null as {
    margin?: { top: number; right: number; left: number; bottom: number };
  } | null,
  yAxisProps: null as {
    domain?: [number, number];
    width?: number;
    tickFormatter?: (v: number) => string;
    label?: {
      value?: string;
      offset?: number;
      fontSize?: number;
    };
  } | null,
  xAxisProps: null as {
    tickFormatter?: (v: number) => string;
  } | null,
}));

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
    AreaChart: (props: {
      children: React.ReactNode;
      data?: Array<{ x: number; baselineDensity: number; recentDensity: number }>;
      margin?: { top: number; right: number; left: number; bottom: number };
    }) => {
      captured.chartData = props.data ?? null;
      captured.chartProps = props;
      return (
        <svg role="img" aria-label="Mock AreaChart">
          {props.children}
        </svg>
      );
    },
    CartesianGrid: () => null,
    XAxis: (props: { tickFormatter?: (v: number) => string }) => {
      captured.xAxisProps = props;
      return null;
    },
    YAxis: (props: {
      domain?: [number, number];
      width?: number;
      tickFormatter?: (v: number) => string;
      label?: {
        value?: string;
        offset?: number;
        fontSize?: number;
      };
    }) => {
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

  describe('Pointer dragging and track interaction', () => {
    it('handles pointer dragging on Scrubber 1 body to shift baseline sample window', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 600,
        bottom: 130,
        width: 500,
        height: 80,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      expect(scrubber1).toHaveAttribute('aria-valuenow', '1');
      expect(screen.getByText('(#1–#6)')).toBeInTheDocument();

      // Drag right by 100px (100 / 500 * 20 = 4 solves)
      fireEvent.pointerDown(scrubber1, { clientX: 200, pointerId: 1 });
      fireEvent.pointerMove(scrubber1, { clientX: 300, pointerId: 1 });
      fireEvent.pointerUp(scrubber1, { clientX: 300, pointerId: 1 });

      expect(scrubber1).toHaveAttribute('aria-valuenow', '5');
      expect(screen.getByText('(#5–#10)')).toBeInTheDocument();

      // Drag left past boundary 0 (delta = -200px -> -8 solves)
      fireEvent.pointerDown(scrubber1, { clientX: 300, pointerId: 1 });
      fireEvent.pointerMove(scrubber1, { clientX: 100, pointerId: 1 });
      fireEvent.pointerUp(scrubber1, { clientX: 100, pointerId: 1 });

      expect(scrubber1).toHaveAttribute('aria-valuenow', '1');
      expect(screen.getByText('(#1–#6)')).toBeInTheDocument();

      // Drag right past maximum boundary (maxStart = 20 - 6 = 14)
      fireEvent.pointerDown(scrubber1, { clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(scrubber1, { clientX: 600, pointerId: 1 });
      fireEvent.pointerUp(scrubber1, { clientX: 600, pointerId: 1 });

      expect(scrubber1).toHaveAttribute('aria-valuenow', '15');
      expect(screen.getAllByText('(#15–#20)')).toHaveLength(2);
    });

    it('handles pointer dragging on Scrubber 2 body to shift recent sample window', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 600,
        bottom: 130,
        width: 500,
        height: 80,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const scrubber2 = screen.getByLabelText('Recent scrubber position');
      // Starts at 20 - 6 = 14 (1-based: 15)
      expect(scrubber2).toHaveAttribute('aria-valuenow', '15');
      expect(screen.getByText('(#15–#20)')).toBeInTheDocument();

      // Drag left by 100px (-4 solves)
      fireEvent.pointerDown(scrubber2, { clientX: 450, pointerId: 2 });
      fireEvent.pointerMove(scrubber2, { clientX: 350, pointerId: 2 });
      fireEvent.pointerUp(scrubber2, { clientX: 350, pointerId: 2 });

      expect(scrubber2).toHaveAttribute('aria-valuenow', '11');
      expect(screen.getByText('(#11–#16)')).toBeInTheDocument();
    });

    it('handles pointer dragging on right resize handle to expand and shrink sample size symmetrically', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 600,
        bottom: 130,
        width: 500,
        height: 80,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');
      const rightHandle1 = screen.getByLabelText('Baseline right resize handle');

      // Expand window: drag right handle to the right by 50px (+2 solves)
      fireEvent.pointerDown(rightHandle1, { clientX: 250, pointerId: 3 });
      fireEvent.pointerMove(rightHandle1, { clientX: 300, pointerId: 3 });
      fireEvent.pointerUp(rightHandle1, { clientX: 300, pointerId: 3 });

      // Symmetrical expansion: 6 + 2 = 8 solves (40% width)
      expect(scrubber1.style.width).toBe('40%');
      expect(scrubber2.style.width).toBe('40%');
      expect(screen.getByText('(#1–#8)')).toBeInTheDocument();
      expect(screen.getByText('(#13–#20)')).toBeInTheDocument();

      // Shrink window: drag right handle to the left by 200px (-8 solves, clamped to min 3 solves)
      fireEvent.pointerDown(rightHandle1, { clientX: 300, pointerId: 3 });
      fireEvent.pointerMove(rightHandle1, { clientX: 100, pointerId: 3 });
      fireEvent.pointerUp(rightHandle1, { clientX: 100, pointerId: 3 });

      // Clamped to minimum 3 solves: 3 / 20 = 15% width
      expect(scrubber1.style.width).toBe('15%');
      expect(scrubber2.style.width).toBe('15%');
      expect(screen.getByText('(#1–#3)')).toBeInTheDocument();
      expect(screen.getByText('(#13–#15)')).toBeInTheDocument();
    });

    it('handles pointer dragging on left resize handle of scrubber 1 and scrubber 2', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 600,
        bottom: 130,
        width: 500,
        height: 80,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');

      // Slide scrubber1 to start index 3 (solve #4)
      fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
      fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
      fireEvent.keyDown(scrubber1, { key: 'ArrowRight' });
      expect(scrubber1).toHaveAttribute('aria-valuenow', '4');

      // Drag left handle of scrubber 1 to the left (expanding from start 3 to start 1)
      const leftHandle1 = screen.getByLabelText('Baseline left resize handle');
      fireEvent.pointerDown(leftHandle1, { clientX: 200, pointerId: 4 });
      fireEvent.pointerMove(leftHandle1, { clientX: 150, pointerId: 4 });
      fireEvent.pointerUp(leftHandle1, { clientX: 150, pointerId: 4 });

      // Fixed end was 3 + 6 = 9. Moving start from 3 to 1 -> new count is 8 solves
      expect(scrubber1.style.width).toBe('40%');
      expect(scrubber2.style.width).toBe('40%');

      // Now test left handle of scrubber 2
      const leftHandle2 = screen.getByLabelText('Recent left resize handle');
      fireEvent.pointerDown(leftHandle2, { clientX: 400, pointerId: 5 });
      fireEvent.pointerMove(leftHandle2, { clientX: 350, pointerId: 5 });
      fireEvent.pointerUp(leftHandle2, { clientX: 350, pointerId: 5 });

      expect(Number.parseFloat(scrubber2.style.width)).toBeGreaterThanOrEqual(40);

      // Drag left handle of scrubber 2 to the right (shrinking from start 10 to start 13)
      fireEvent.pointerDown(leftHandle2, { clientX: 350, pointerId: 7 });
      fireEvent.pointerMove(leftHandle2, { clientX: 425, pointerId: 7 });
      fireEvent.pointerUp(leftHandle2, { clientX: 425, pointerId: 7 });
      expect(Number.parseFloat(scrubber2.style.width)).toBeLessThan(40);
    });

    it('handles pointer dragging on right resize handle of scrubber 2 to resize sample window symmetrically', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        right: 600,
        bottom: 130,
        width: 500,
        height: 80,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');
      const rightHandle2 = screen.getByLabelText('Recent right resize handle');

      // Move scrubber 2 left first so it has room to expand right
      fireEvent.keyDown(scrubber2, { key: 'ArrowLeft' });
      fireEvent.keyDown(scrubber2, { key: 'ArrowLeft' });
      fireEvent.keyDown(scrubber2, { key: 'ArrowLeft' });

      // Drag scrubber 2 right handle to the right by 50px
      fireEvent.pointerDown(rightHandle2, { clientX: 400, pointerId: 20 });
      fireEvent.pointerMove(rightHandle2, { clientX: 450, pointerId: 20 });
      fireEvent.pointerUp(rightHandle2, { clientX: 450, pointerId: 20 });

      // Symmetrical expansion
      expect(Number.parseFloat(scrubber1.style.width)).toBeGreaterThanOrEqual(30);
      expect(Number.parseFloat(scrubber2.style.width)).toBeGreaterThanOrEqual(30);

      // Shrink window: drag right handle to the left by 250px (clamped to min 3 solves)
      fireEvent.pointerDown(rightHandle2, { clientX: 450, pointerId: 21 });
      fireEvent.pointerMove(rightHandle2, { clientX: 200, pointerId: 21 });
      fireEvent.pointerUp(rightHandle2, { clientX: 200, pointerId: 21 });

      expect(scrubber2.style.width).toBe('15%');
      expect(scrubber1.style.width).toBe('15%');
    });

    it('throttles pointer move with requestAnimationFrame in browser environments', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });

      let rafCallback: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 99;
      });
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      try {
        render(<DensityShiftChart solves={mockSolves} />);
        const scrubber1 = screen.getByLabelText('Baseline scrubber position');

        fireEvent.pointerDown(scrubber1, { clientX: 100, pointerId: 10 });
        fireEvent.pointerMove(scrubber1, { clientX: 200, pointerId: 10 });

        expect(rafSpy).toHaveBeenCalled();
        expect(rafCallback).not.toBeNull();

        // Second move while RAF is pending
        fireEvent.pointerMove(scrubber1, { clientX: 250, pointerId: 10 });

        // Execute RAF callback
        act(() => {
          rafCallback?.(16);
        });

        // Pointer up cancels pending RAF
        act(() => {
          fireEvent.pointerDown(scrubber1, { clientX: 100, pointerId: 11 });
          fireEvent.pointerMove(scrubber1, { clientX: 150, pointerId: 11 });
          fireEvent.pointerUp(scrubber1, { clientX: 150, pointerId: 11 });
        });
        expect(cancelSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          configurable: true,
        });
        rafSpy.mockRestore();
        cancelSpy.mockRestore();
      }
    });

    it('stops event propagation when clicking scrubbers and handles directly', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 80,
        width: 1000,
        height: 80,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');
      const leftHandle1 = screen.getByLabelText('Baseline left resize handle');
      const rightHandle1 = screen.getByLabelText('Baseline right resize handle');
      const leftHandle2 = screen.getByLabelText('Recent left resize handle');
      const rightHandle2 = screen.getByLabelText('Recent right resize handle');

      const initialStart1 = scrubber1.getAttribute('aria-valuenow');
      const initialStart2 = scrubber2.getAttribute('aria-valuenow');

      // Clicking at clientX = 500 would target solve 10 if it bubbled to track.
      // But because scrubbers and handles call stopPropagation, scrubbers do not reposition.
      fireEvent.click(scrubber1, { clientX: 500 });
      fireEvent.click(scrubber2, { clientX: 500 });
      fireEvent.click(leftHandle1, { clientX: 500 });
      fireEvent.click(rightHandle1, { clientX: 500 });
      fireEvent.click(leftHandle2, { clientX: 500 });
      fireEvent.click(rightHandle2, { clientX: 500 });

      expect(scrubber1).toHaveAttribute('aria-valuenow', initialStart1);
      expect(scrubber2).toHaveAttribute('aria-valuenow', initialStart2);
    });

    it('prevents default behavior on track when Space or Enter key is pressed', () => {
      render(<DensityShiftChart solves={mockSolves} />);
      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);

      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      });
      track.dispatchEvent(spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(true);

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      track.dispatchEvent(enterEvent);
      expect(enterEvent.defaultPrevented).toBe(true);
    });

    it('handles comprehensive keyboard shortcuts for both scrubbers', () => {
      render(<DensityShiftChart solves={mockSolves} />);
      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');

      // Scrubber 1: Alt+ArrowLeft shrinks sample count
      fireEvent.keyDown(scrubber1, { key: 'ArrowLeft', altKey: true });
      expect(scrubber1.style.width).toBe('25%');

      // Scrubber 1: Shift+ArrowRight steps by 5% (1 solve)
      fireEvent.keyDown(scrubber1, { key: 'ArrowRight', shiftKey: true });
      expect(scrubber1).toHaveAttribute('aria-valuenow', '2');

      // Scrubber 1: Shift+ArrowLeft steps by 5% (1 solve)
      fireEvent.keyDown(scrubber1, { key: 'ArrowLeft', shiftKey: true });
      expect(scrubber1).toHaveAttribute('aria-valuenow', '1');

      // Scrubber 2: Alt+ArrowRight expands sample count
      fireEvent.keyDown(scrubber2, { key: 'ArrowRight', altKey: true });
      expect(scrubber2.style.width).toBe('30%');

      // Scrubber 2: ArrowLeft and ArrowRight navigation
      fireEvent.keyDown(scrubber2, { key: 'ArrowLeft' });
      expect(scrubber2).toHaveAttribute('aria-valuenow', '14');

      fireEvent.keyDown(scrubber2, { key: 'ArrowRight' });
      expect(scrubber2).toHaveAttribute('aria-valuenow', '15');

      // Scrubber 2: Shift navigation
      fireEvent.keyDown(scrubber2, { key: 'ArrowLeft', shiftKey: true });
      expect(scrubber2).toHaveAttribute('aria-valuenow', '14');

      fireEvent.keyDown(scrubber2, { key: 'ArrowRight', shiftKey: true });
      expect(scrubber2).toHaveAttribute('aria-valuenow', '15');
    });

    it('handles pointer cancel gracefully without getting stuck in active drag state', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      fireEvent.pointerDown(scrubber1, { clientX: 150, pointerId: 6 });
      fireEvent.pointerCancel(scrubber1, { pointerId: 6 });

      // Subsequent pointer move without active drag does not change state
      fireEvent.pointerMove(scrubber1, { clientX: 350, pointerId: 6 });
      expect(scrubber1).toHaveAttribute('aria-valuenow', '1');
    });

    it('repositions closest scrubber when clicking along the timeline track', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 80,
        width: 1000,
        height: 80,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const scrubber2 = screen.getByLabelText('Recent scrubber position');

      // Click at x = 200 (20% of 1000 = solve 4, closer to scrubber 1 which is around solve 3)
      fireEvent.click(track, { clientX: 200 });
      // Center of scrubber 1 moves towards solve 4 (targetStart = 4 - 3 = 1 -> solve #2)
      expect(scrubber1).toHaveAttribute('aria-valuenow', '2');

      // Click at x = 800 (80% of 1000 = solve 16, closer to scrubber 2 which is at solve 15)
      fireEvent.click(track, { clientX: 800 });
      // Center of scrubber 2 moves towards solve 16 (targetStart = 16 - 3 = 13 -> solve #14)
      expect(scrubber2).toHaveAttribute('aria-valuenow', '14');
    });

    it('ignores track click when totalSolves is 0 or rect is missing or drag just ended', () => {
      const { rerender } = render(<DensityShiftChart solves={[]} />);
      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      expect(() => fireEvent.click(track, { clientX: 200 })).not.toThrow();

      rerender(<DensityShiftChart solves={mockSolves} />);
      const scrubber1 = screen.getByLabelText('Baseline scrubber position');
      const initialPos = scrubber1.getAttribute('aria-valuenow');

      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(undefined as unknown as DOMRect);
      fireEvent.click(track, { clientX: 200 });
      expect(scrubber1).toHaveAttribute('aria-valuenow', initialPos);

      // Drag just ended: dragMovedRef prevents track click immediately following drag
      vi.restoreAllMocks();
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 80,
        width: 1000,
        height: 80,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      fireEvent.pointerDown(scrubber1, { clientX: 100, pointerId: 99 });
      fireEvent.pointerMove(scrubber1, { clientX: 140, pointerId: 99 });
      fireEvent.pointerUp(scrubber1, { clientX: 140, pointerId: 99 });

      const posAfterDrag = scrubber1.getAttribute('aria-valuenow');
      fireEvent.click(track, { clientX: 800 });
      expect(scrubber1).toHaveAttribute('aria-valuenow', posAfterDrag);
    });

    it('formats X and Y axis tick labels properly across scale ranges', () => {
      const { unmount } = render(<DensityShiftChart solves={mockSolves} />);

      expect(captured.xAxisProps?.tickFormatter).toBeDefined();
      expect(captured.xAxisProps?.tickFormatter?.(12.345)).toBe('12.3s');

      expect(captured.yAxisProps?.tickFormatter).toBeDefined();
      expect(captured.yAxisProps?.tickFormatter?.(0)).toBe('0');
      expect(captured.yAxisProps?.tickFormatter?.(0.456)).toBe('0.46');
      unmount();

      // Wide spread distribution (< 0.02 ceiling)
      const wideSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: 10 + idx * 50,
      }));
      const { unmount: unmountWide } = render(<DensityShiftChart solves={wideSolves} />);
      expect(captured.yAxisProps?.tickFormatter?.(0.0123)).toBe('0.012');
      unmountWide();
    });
  });

  describe('Plot generation and edge case resilience', () => {
    it('handles empty dataset gracefully without crashing or invalid domains', () => {
      render(<DensityShiftChart solves={[]} title="Empty Solves Test" />);

      expect(screen.getByText('Empty Solves Test')).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Solve distribution timeline scrubbers track/i),
      ).toBeInTheDocument();
      // No crash, default Y ceiling is set
      expect(captured.yAxisProps?.domain).toEqual([0, 0.25]);
    });

    it('handles small datasets with fewer than 3 solves safely', () => {
      render(<DensityShiftChart solves={mockSolves.slice(0, 2)} />);

      // Sparkline is rendered for >= 2 solves
      const track = screen.getByLabelText(/Solve distribution timeline scrubbers track/i);
      expect(track.querySelector('svg')).toBeInTheDocument();
      expect(captured.chartData).toBeDefined();
    });

    it('filters extreme outliers when computing global domain to prevent chart squashing', () => {
      const solvesWithOutlier: Solve[] = [
        ...mockSolves,
        {
          id: 999,
          index: 21,
          timeMs: 450000,
          rawTimeSec: 450.0,
          finalTimeSec: 450.0,
          penalty: 'OK',
          timestamp: 1600000000000,
          date: new Date(1600000000000),
          dateStr: '2020-09-13',
        },
      ];

      render(<DensityShiftChart solves={solvesWithOutlier} />);

      // Global domain max should be reasonably bounded by IQR rather than 450s * 1.15
      const domainPoints = captured.chartData?.map((p) => p.x) ?? [];
      const maxPlotX = Math.max(...domainPoints);
      expect(maxPlotX).toBeLessThan(50);
    });

    it('handles solves with identical times without divide-by-zero errors', () => {
      const flatSolves: Solve[] = Array.from({ length: 15 }, (_, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: 12.0,
        timeMs: 12000,
      }));

      render(<DensityShiftChart solves={flatSolves} />);

      expect(captured.chartData).toBeDefined();
      expect(captured.chartData?.length).toBeGreaterThan(0);
      for (const point of captured.chartData ?? []) {
        expect(Number.isNaN(point.baselineDensity)).toBe(false);
        expect(Number.isNaN(point.recentDensity)).toBe(false);
      }
    });

    it('includes responsive timeline instruction label class for mobile visibility', () => {
      render(<DensityShiftChart solves={mockSolves} />);

      const instruction = screen.getByText(
        /Drag scrubbers to move · Drag ribbed ends to resize sample window/,
      );
      expect(instruction).toBeInTheDocument();
      // On mobile portrait, instruction is hidden via Tailwind 'hidden sm:inline'
      expect(instruction).toHaveClass('hidden');
      expect(instruction).toHaveClass('sm:inline');
    });

    it('renders bottom axis title and maximizes chart width with compact Y-axis on mobile portrait', () => {
      const originalInnerWidth = window.innerWidth;
      try {
        window.innerWidth = 390;
        render(<DensityShiftChart solves={mockSolves} />);

        expect(screen.getByText('Density')).toBeInTheDocument();

        expect(captured.yAxisProps?.width).toBeLessThan(45);
        expect(captured.yAxisProps?.label).toBeUndefined();
      } finally {
        window.innerWidth = originalInnerWidth;
      }
    });

    it('renders standard rotated Y-axis label on desktop without bottom text', () => {
      const originalInnerWidth = window.innerWidth;
      try {
        window.innerWidth = 1024;
        render(<DensityShiftChart solves={mockSolves} />);

        // In desktop mode, bottom axis title is omitted (Density only in rotated label)
        expect(screen.queryByText('Density')).not.toBeInTheDocument();
        expect(captured.yAxisProps?.width).toBeGreaterThanOrEqual(45);
        expect(captured.yAxisProps?.label?.value).toBe('Density');
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
        const { unmount } = render(<DensityShiftChart solves={mockSolves} />);

        expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(screen.queryByText('Density')).not.toBeInTheDocument();

        act(() => {
          window.innerWidth = 375;
          fireEvent(window, new Event('resize'));
        });

        expect(screen.getByText('Density')).toBeInTheDocument();

        act(() => {
          window.innerWidth = 1024;
          fireEvent(window, new Event('resize'));
        });

        expect(screen.queryByText('Density')).not.toBeInTheDocument();

        unmount();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      } finally {
        window.innerWidth = originalInnerWidth;
        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
      }
    });
  });
});
