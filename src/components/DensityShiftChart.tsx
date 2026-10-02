import type React from 'react';
import { useId, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GroupingPeriod, Solve } from '../types';
import { calculateKDEFromSamples, getNormalizedYCeilingWithHysteresis } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

interface DensityShiftChartProps {
  solves: Solve[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const DensityShiftChart: React.FC<DensityShiftChartProps> = ({
  solves,
  groupingPeriod: _groupingPeriod,
  title = 'Distribution Density Shift',
}) => {
  const trackGradientId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const latestDeltaSolvesRef = useRef<number>(0);
  const prevCeilingRef = useRef<number>(0.25);

  // Filter valid (non-DNF) solves
  const validSolves = useMemo(() => solves.filter((s) => s.penalty !== 'DNF'), [solves]);
  const totalSolves = validSolves.length;

  // Symmetrical sample count shared by both scrubbers (default 30% of solves)
  const defaultCount = Math.max(3, Math.min(totalSolves, Math.round(totalSolves * 0.3)));
  const [sampleCountState, setSampleCountState] = useState<number | null>(null);
  const sampleCount = Math.max(
    3,
    Math.min(totalSolves, sampleCountState ?? (totalSolves > 0 ? defaultCount : 3)),
  );

  // Scrubber start positions
  const maxStart = Math.max(0, totalSolves - sampleCount);
  const [start1State, setStart1State] = useState<number | null>(null);
  const [start2State, setStart2State] = useState<number | null>(null);

  const start1 = Math.max(0, Math.min(maxStart, start1State ?? 0));
  const start2 = Math.max(0, Math.min(maxStart, start2State ?? maxStart));

  // Stable global domain across all solves in the session to eliminate X-axis jitter
  const globalDomain = useMemo(() => {
    if (validSolves.length === 0) return { minTime: 0, maxTime: 30 };
    const times = validSolves.map((s) => s.finalTimeSec);
    const sorted = [...times].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const outlierThreshold = iqr > 0 ? q3 + 3 * iqr : sorted[n - 1] + 5;

    const minTime = Math.max(0, Math.floor(sorted[0] - 2));
    const effectiveMax = Math.min(sorted[n - 1], outlierThreshold);
    const maxTime = Math.ceil(effectiveMax + 3);

    return { minTime, maxTime: Math.max(minTime + 5, maxTime) };
  }, [validSolves]);

  // Active drag state: can move whole body or resize via left/right ribbed ends
  const [activeDrag, setActiveDrag] = useState<{
    type: 'move' | 'resize-start' | 'resize-end';
    scrubber: 1 | 2;
    startX: number;
    initialStart1: number;
    initialStart2: number;
    initialCount: number;
    trackWidth: number;
    pointerId: number;
  } | null>(null);

  // Sample subsets based on scrubber positions and symmetrical width
  const sample1Solves = useMemo(
    () => validSolves.slice(start1, start1 + sampleCount),
    [validSolves, start1, sampleCount],
  );
  const sample2Solves = useMemo(
    () => validSolves.slice(start2, start2 + sampleCount),
    [validSolves, start2, sampleCount],
  );

  // Calculate KDE curves comparing Sample 1 (Baseline) and Sample 2 (Recent) over stable global domain
  const kdeData = useMemo(
    () => calculateKDEFromSamples(sample1Solves, sample2Solves, 120, globalDomain),
    [sample1Solves, sample2Solves, globalDomain],
  );

  // Normalized Y-axis ceiling with hysteresis damping to eliminate scale jumping
  const yCeiling = useMemo(() => {
    if (kdeData.length === 0) return 0.25;
    let max = 0;
    for (let i = 0; i < kdeData.length; i++) {
      if (kdeData[i].baselineDensity > max) max = kdeData[i].baselineDensity;
      if (kdeData[i].recentDensity > max) max = kdeData[i].recentDensity;
    }
    const nextCeiling = getNormalizedYCeilingWithHysteresis(max, prevCeilingRef.current);
    prevCeilingRef.current = nextCeiling;
    return nextCeiling;
  }, [kdeData]);

  // Symmetrical summary statistics for Sample 1 (Baseline) and Sample 2 (Recent)
  const statsSummary = useMemo(() => {
    if (sample1Solves.length === 0 || sample2Solves.length === 0 || validSolves.length < 10) {
      return null;
    }

    const bTimes = sample1Solves.map((s) => s.finalTimeSec);
    const rTimes = sample2Solves.map((s) => s.finalTimeSec);

    const bMean = bTimes.reduce((a, b) => a + b, 0) / bTimes.length;
    const rMean = rTimes.reduce((a, b) => a + b, 0) / rTimes.length;

    return {
      baselineCount: bTimes.length,
      recentCount: rTimes.length,
      baselineMean: bMean.toFixed(2),
      recentMean: rMean.toFixed(2),
      diff: (bMean - rMean).toFixed(2),
      start1Index: start1 + 1,
      end1Index: start1 + sampleCount,
      start2Index: start2 + 1,
      end2Index: start2 + sampleCount,
    };
  }, [sample1Solves, sample2Solves, validSolves.length, start1, start2, sampleCount]);

  // Dataset sparkline path for the scrubber track
  const sparklineData = useMemo(() => {
    if (totalSolves < 2) return null;

    const times = validSolves.map((s) => s.finalTimeSec);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const range = Math.max(0.1, maxT - minT);

    const svgWidth = 1000;
    const svgHeight = 72;
    const padTop = 10;
    const padBottom = 10;
    const usableHeight = svgHeight - padTop - padBottom;

    const points = validSolves.map((s, idx) => {
      const x = (idx / (totalSolves - 1)) * svgWidth;
      const normalized = (s.finalTimeSec - minT) / range;
      const y = svgHeight - padBottom - normalized * usableHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const meanY = svgHeight - padBottom - ((mean - minT) / range) * usableHeight;

    return { linePath, areaPath, meanY, minT, maxT, mean };
  }, [validSolves, totalSolves]);

  // Scrubber geometry percentages (symmetrical width)
  const widthPercent = totalSolves > 0 ? (sampleCount / totalSolves) * 100 : 30;
  const leftPercent1 = totalSolves > 0 ? (start1 / totalSolves) * 100 : 0;
  const leftPercent2 = totalSolves > 0 ? (start2 / totalSolves) * 100 : 70;

  // Pointer drag handler for moving scrubber body
  const handleBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>, scrubber: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || 1;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDrag({
      type: 'move',
      scrubber,
      startX: e.clientX,
      initialStart1: start1,
      initialStart2: start2,
      initialCount: sampleCount,
      trackWidth,
      pointerId: e.pointerId,
    });
  };

  // Pointer drag handler for resizing via ribbed ends (symmetrical sample size update)
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    scrubber: 1 | 2,
    edge: 'start' | 'end',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || 1;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDrag({
      type: edge === 'start' ? 'resize-start' : 'resize-end',
      scrubber,
      startX: e.clientX,
      initialStart1: start1,
      initialStart2: start2,
      initialCount: sampleCount,
      trackWidth,
      pointerId: e.pointerId,
    });
  };

  const applyDragDelta = (deltaSolves: number) => {
    if (!activeDrag) return;

    if (activeDrag.type === 'move') {
      const curMaxStart = Math.max(0, totalSolves - activeDrag.initialCount);
      if (activeDrag.scrubber === 1) {
        const newStart1 = Math.max(
          0,
          Math.min(curMaxStart, activeDrag.initialStart1 + deltaSolves),
        );
        setStart1State(newStart1);
      } else {
        const newStart2 = Math.max(
          0,
          Math.min(curMaxStart, activeDrag.initialStart2 + deltaSolves),
        );
        setStart2State(newStart2);
      }
    } else if (activeDrag.type === 'resize-end') {
      // Dragging right edge: anchor left edge, expand/contract width symmetrically
      if (activeDrag.scrubber === 1) {
        const fixedStart1 = activeDrag.initialStart1;
        const requestedEnd1 = fixedStart1 + activeDrag.initialCount + deltaSolves;
        const clampedEnd1 = Math.max(fixedStart1 + 3, Math.min(totalSolves, requestedEnd1));
        const newCount = clampedEnd1 - fixedStart1;

        setSampleCountState(newCount);
        setStart1State(fixedStart1);
        setStart2State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart));
      } else {
        const fixedStart2 = activeDrag.initialStart2;
        const requestedEnd2 = fixedStart2 + activeDrag.initialCount + deltaSolves;
        const clampedEnd2 = Math.max(fixedStart2 + 3, Math.min(totalSolves, requestedEnd2));
        const newCount = clampedEnd2 - fixedStart2;

        setSampleCountState(newCount);
        setStart2State(fixedStart2);
        setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
      }
    } else if (activeDrag.type === 'resize-start') {
      // Dragging left edge: anchor right edge, expand/contract width symmetrically
      if (activeDrag.scrubber === 1) {
        const fixedEnd1 = activeDrag.initialStart1 + activeDrag.initialCount;
        const requestedStart1 = activeDrag.initialStart1 + deltaSolves;
        const clampedStart1 = Math.max(0, Math.min(fixedEnd1 - 3, requestedStart1));
        const newCount = fixedEnd1 - clampedStart1;

        setSampleCountState(newCount);
        setStart1State(clampedStart1);
        setStart2State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart));
      } else {
        const fixedEnd2 = activeDrag.initialStart2 + activeDrag.initialCount;
        const requestedStart2 = activeDrag.initialStart2 + deltaSolves;
        const clampedStart2 = Math.max(0, Math.min(fixedEnd2 - 3, requestedStart2));
        const newCount = fixedEnd2 - clampedStart2;

        setSampleCountState(newCount);
        setStart2State(clampedStart2);
        setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!activeDrag) return;
    const deltaX = e.clientX - activeDrag.startX;
    if (Math.abs(deltaX) > 2) {
      dragMovedRef.current = true;
    }
    const deltaSolves = Math.round((deltaX / activeDrag.trackWidth) * totalSolves);
    latestDeltaSolvesRef.current = deltaSolves;

    // Fluid 60fps frame pacing in browser via RAF, synchronous in jsdom
    if (
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function' &&
      !navigator.userAgent.includes('jsdom')
    ) {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          applyDragDelta(latestDeltaSolvesRef.current);
        });
      }
    } else {
      applyDragDelta(deltaSolves);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (activeDrag) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      applyDragDelta(latestDeltaSolvesRef.current);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(activeDrag.pointerId);
      } catch {
        // Safe fallback
      }
      setActiveDrag(null);
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 50);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMovedRef.current || activeDrag || totalSolves === 0) return;
    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;

    const clickX = e.clientX - trackRect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / trackRect.width));
    const clickSolveIndex = Math.round(clickRatio * totalSolves);

    const center1 = start1 + sampleCount / 2;
    const center2 = start2 + sampleCount / 2;
    const dist1 = Math.abs(clickSolveIndex - center1);
    const dist2 = Math.abs(clickSolveIndex - center2);

    const curMaxStart = Math.max(0, totalSolves - sampleCount);
    if (dist1 <= dist2) {
      const targetStart = Math.max(
        0,
        Math.min(curMaxStart, Math.round(clickSolveIndex - sampleCount / 2)),
      );
      setStart1State(targetStart);
    } else {
      const targetStart = Math.max(
        0,
        Math.min(curMaxStart, Math.round(clickSolveIndex - sampleCount / 2)),
      );
      setStart2State(targetStart);
    }
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value?: number }>;
    label?: string | number;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-xl border border-stone-700 bg-stone-900/95 p-3 text-xs text-stone-200 shadow-2xl backdrop-blur-md">
        <div className="mb-2 border-b border-stone-800 pb-1 font-mono font-bold text-stone-100">
          Solve Time: {label}s
        </div>
        <div className="space-y-1 font-mono">
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Baseline Density:</span>
            <span>{payload[0]?.value?.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Recent Density:</span>
            <span>{payload[1]?.value?.toFixed(4)}</span>
          </div>
        </div>
      </div>
    );
  };

  const baselineSeriesName = `Baseline Solves (#${start1 + 1}–#${start1 + sampleCount})`;
  const recentSeriesName = `Recent Solves (#${start2 + 1}–#${start2 + sampleCount})`;

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Kernel Density Estimation (KDE) comparison showing probability density shift between any two sampled regions across the session distribution."
      headerBadge={<span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400"></span>}
      filenamePrefix="density_shift_distribution"
    >
      {/* Symmetrical, consistently distributed mean shift banner */}
      {statsSummary && (
        <div className="grid grid-cols-1 divide-y divide-stone-800/80 rounded-xl border border-stone-800/70 bg-stone-950/60 text-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center justify-center gap-2 p-3 text-center">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-rose-400 bg-rose-500/80"></span>
            <span className="text-stone-400">Baseline Mean:</span>
            <span className="font-mono font-bold text-rose-300">{statsSummary.baselineMean}s</span>
            <span className="font-mono text-[11px] text-stone-500">
              (#{statsSummary.start1Index}–#{statsSummary.end1Index})
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 text-center">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-emerald-400 bg-emerald-500/80"></span>
            <span className="text-stone-400">Recent Mean:</span>
            <span className="font-mono font-bold text-emerald-300">{statsSummary.recentMean}s</span>
            <span className="font-mono text-[11px] text-stone-500">
              (#{statsSummary.start2Index}–#{statsSummary.end2Index})
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 text-center">
            <span className="text-stone-400">Distribution Shift:</span>
            <span className="font-mono font-bold text-amber-400">
              {Number(statsSummary.diff) > 0
                ? `-${statsSummary.diff}s faster`
                : Number(statsSummary.diff) < 0
                  ? `+${Math.abs(Number(statsSummary.diff)).toFixed(2)}s slower`
                  : 'no change'}
            </span>
          </div>
        </div>
      )}

      {/* Main Area Chart with GPU-composited fluid transitions */}
      <div
        className={`h-[360px] w-full pt-2 ${
          activeDrag
            ? ''
            : '[&_.recharts-curve]:transition-[d] [&_.recharts-curve]:duration-200 [&_.recharts-curve]:ease-out'
        }`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 800, height: 360 }}
        >
          <AreaChart data={kdeData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorRecent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="x"
              interval={Math.max(1, Math.floor(kdeData.length / 8))}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v: number) => `${Number(v.toFixed(1))}s`}
              label={{
                value: 'Solve Time (seconds)',
                position: 'insideBottom',
                offset: -12,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <YAxis
              width={48}
              domain={[0, yCeiling]}
              allowDataOverflow={false}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v: number) => {
                if (v === 0) return '0';
                if (yCeiling < 0.02) return v.toFixed(3);
                if (yCeiling < 1) return v.toFixed(2);
                return v.toFixed(1);
              }}
              label={{
                value: 'Density',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />

            {/* Baseline Density Area (Red) */}
            <Area
              isAnimationActive={!activeDrag}
              animationDuration={250}
              animationEasing="ease-out"
              type="monotone"
              dataKey="baselineDensity"
              name={baselineSeriesName}
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBaseline)"
            />

            {/* Recent Density Area (Green) */}
            <Area
              isAnimationActive={!activeDrag}
              animationDuration={250}
              animationEasing="ease-out"
              type="monotone"
              dataKey="recentDensity"
              name={recentSeriesName}
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRecent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Direct-Manipulation Distribution Scrubbers Track (below the chart, under Solve Time) */}
      <div className="mt-3 flex flex-col gap-2">
        <section
          ref={trackRef}
          onClick={handleTrackClick}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          className="relative h-20 w-full cursor-pointer select-none rounded-xl border border-stone-800 bg-stone-950/90 shadow-inner"
          aria-label="Solve distribution timeline scrubbers track"
        >
          {/* Visual representation of dataset on the track (sparkline & mean line) */}
          {sparklineData && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 72"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={trackGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <path d={sparklineData.areaPath} fill={`url(#${trackGradientId})`} />
              <path
                d={sparklineData.linePath}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                opacity={0.8}
              />
              <line
                x1="0"
                y1={sparklineData.meanY}
                x2="1000"
                y2={sparklineData.meanY}
                stroke="#52525b"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity={0.6}
              />
            </svg>
          )}

          {/* Scrubber 1 (Baseline - Rose with opacity, no text badge) */}
          <div
            tabIndex={0}
            role="slider"
            aria-label="Baseline scrubber position"
            aria-valuenow={start1 + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, totalSolves - sampleCount + 1)}
            style={{
              left: `${leftPercent1}%`,
              width: `${widthPercent}%`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => handleBodyPointerDown(e, 1)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={(e) => {
              const step = e.shiftKey ? Math.max(1, Math.round(totalSolves * 0.05)) : 1;
              if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                const newCount = Math.min(totalSolves, sampleCount + step);
                setSampleCountState(newCount);
                setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
                setStart2State((prev) =>
                  Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart),
                );
              } else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                setSampleCountState(Math.max(3, sampleCount - step));
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setStart1State(Math.max(0, start1 - step));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setStart1State(Math.min(maxStart, start1 + step));
              }
            }}
            className={`group absolute top-0 bottom-0 z-10 flex cursor-grab items-center justify-between rounded-lg border-2 border-rose-500/80 bg-rose-500/25 shadow-lg backdrop-blur-[1px] touch-none hover:border-rose-400 hover:bg-rose-500/35 focus:ring-2 focus:ring-rose-400 focus:outline-none active:cursor-grabbing ${
              activeDrag ? '' : 'transition-all duration-150 ease-out'
            }`}
          >
            {/* Left Ribbed Resize Handle */}
            <button
              type="button"
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-l bg-rose-500/10 transition-colors hover:bg-rose-400/30"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 1, 'start')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Baseline left resize handle"
              title="Drag to resize sample window"
            >
              <span className="h-4 w-[1.5px] rounded-full bg-rose-200/70 transition-colors group-hover/handle:bg-white" />
              <span className="h-4 w-[1.5px] rounded-full bg-rose-200/70 transition-colors group-hover/handle:bg-white" />
            </button>

            {/* Right Ribbed Resize Handle */}
            <button
              type="button"
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-r bg-rose-500/10 transition-colors hover:bg-rose-400/30"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 1, 'end')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Baseline right resize handle"
              title="Drag to resize sample window"
            >
              <span className="h-4 w-[1.5px] rounded-full bg-rose-200/70 transition-colors group-hover/handle:bg-white" />
              <span className="h-4 w-[1.5px] rounded-full bg-rose-200/70 transition-colors group-hover/handle:bg-white" />
            </button>
          </div>

          {/* Scrubber 2 (Recent - Emerald with opacity, no text badge) */}
          <div
            tabIndex={0}
            role="slider"
            aria-label="Recent scrubber position"
            aria-valuenow={start2 + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, totalSolves - sampleCount + 1)}
            style={{
              left: `${leftPercent2}%`,
              width: `${widthPercent}%`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => handleBodyPointerDown(e, 2)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={(e) => {
              const step = e.shiftKey ? Math.max(1, Math.round(totalSolves * 0.05)) : 1;
              if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                const newCount = Math.min(totalSolves, sampleCount + step);
                setSampleCountState(newCount);
                setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
                setStart2State((prev) =>
                  Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart),
                );
              } else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                setSampleCountState(Math.max(3, sampleCount - step));
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setStart2State(Math.max(0, start2 - step));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setStart2State(Math.min(maxStart, start2 + step));
              }
            }}
            className={`group absolute top-0 bottom-0 z-20 flex cursor-grab items-center justify-between rounded-lg border-2 border-emerald-500/80 bg-emerald-500/25 shadow-lg backdrop-blur-[1px] touch-none hover:border-emerald-400 hover:bg-emerald-500/35 focus:ring-2 focus:ring-emerald-400 focus:outline-none active:cursor-grabbing ${
              activeDrag ? '' : 'transition-all duration-150 ease-out'
            }`}
          >
            {/* Left Ribbed Resize Handle */}
            <button
              type="button"
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-l bg-emerald-500/10 transition-colors hover:bg-emerald-400/30"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 2, 'start')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Recent left resize handle"
              title="Drag to resize sample window"
            >
              <span className="h-4 w-[1.5px] rounded-full bg-emerald-200/70 transition-colors group-hover/handle:bg-white" />
              <span className="h-4 w-[1.5px] rounded-full bg-emerald-200/70 transition-colors group-hover/handle:bg-white" />
            </button>

            {/* Right Ribbed Resize Handle */}
            <button
              type="button"
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-r bg-emerald-500/10 transition-colors hover:bg-emerald-400/30"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 2, 'end')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label="Recent right resize handle"
              title="Drag to resize sample window"
            >
              <span className="h-4 w-[1.5px] rounded-full bg-emerald-200/70 transition-colors group-hover/handle:bg-white" />
              <span className="h-4 w-[1.5px] rounded-full bg-emerald-200/70 transition-colors group-hover/handle:bg-white" />
            </button>
          </div>
        </section>

        {/* Track Timeline Labels */}
        <div className="flex items-center justify-between px-1 text-[11px] text-stone-500">
          <span>Solve #1</span>
          <span className="hidden sm:inline">
            Drag scrubbers to move · Drag ribbed ends to resize sample window ({sampleCount} solves)
          </span>
          <span>Solve #{totalSolves}</span>
        </div>
      </div>
    </ChartCardWrapper>
  );
};
