import { Activity } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAutoDismissTooltip } from '../hooks/useAutoDismissTooltip';
import { type ThemePalette, useTheme } from '../theme';
import type { GroupingPeriod, PeriodGroup, Solve } from '../types';
import {
  calculateEarthMoverDistance,
  calculateKDEFromSamples,
  calculateOverlapCoefficient,
  calculatePeakDistance,
  calculateSubTargetChance,
  calculateTailRisk,
  findKDEPeak,
  getNormalizedYCeilingWithHysteresis,
  groupSolvesByPeriod,
  selectSpeedcubingMilestone,
} from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';
import { InfoTooltip } from './InfoTooltip';

interface DensityShiftChartProps {
  id?: string;
  solves: Solve[];
  groupingPeriod?: GroupingPeriod;
  periodGroups?: PeriodGroup[];
  customBatchSize?: number;
  title?: string;
}

interface MetricTileProps {
  id: string;
  label: string;
  value: string;
  valueColor: string;
  hint: string;
  sublabel?: string;
  colors: ThemePalette;
}

/**
 * Compact readout for a single distribution comparison metric. The headline value
 * stays minimal; the adjoining help icon reveals the definition on hover so the
 * banner never has to explain itself inline.
 */
const MetricTile: React.FC<MetricTileProps> = ({
  id,
  label,
  value,
  valueColor,
  hint,
  sublabel,
  colors,
}) => (
  <div
    id={id}
    className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border p-2.5 text-center"
    style={{ backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }}
  >
    <span
      className="inline-flex max-w-full items-center gap-1 text-[11px] font-medium"
      style={{ color: colors.textSecondary }}
    >
      <InfoTooltip id={`${id}-info`} label={`${label} explanation`} text={hint} />
      <span className="truncate">{label}</span>
    </span>
    <span
      id={`${id}-value`}
      className="font-mono text-base font-bold"
      style={{ color: valueColor }}
    >
      {value}
    </span>
    {sublabel && (
      <span className="text-[10px] leading-tight" style={{ color: colors.textMuted }}>
        {sublabel}
      </span>
    )}
  </div>
);

type ReadoutTone = 'good' | 'bad' | 'neutral';

/** Resolves a readout tone to a palette colour, keeping colour choice in one place. */
function toneColor(tone: ReadoutTone, colors: ThemePalette): string {
  if (tone === 'good') return colors.series.green;
  if (tone === 'bad') return colors.series.red;
  return colors.textSecondary;
}

/**
 * Classifies a signed change as good/bad/neutral (neutral within `threshold`). Set
 * `improveWhenNegative` for metrics where a decrease is the desirable direction.
 */
function changeTone(
  change: number | null,
  threshold: number,
  improveWhenNegative = false,
): ReadoutTone {
  if (change == null || Math.abs(change) <= threshold) return 'neutral';
  const improves = improveWhenNegative ? change < 0 : change > 0;
  return improves ? 'good' : 'bad';
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Frames a slow-solve frequency change as "N% fewer/more" or "no change". */
function formatTailText(change: number | null): string {
  if (change == null) return '—';
  const percent = Math.abs(Math.round(change * 100));
  if (change > 0.0001) return `${percent}% more`;
  if (change < -0.0001) return `${percent}% fewer`;
  return 'no change';
}

export const DensityShiftChart: React.FC<DensityShiftChartProps> = ({
  id = 'density-shift-chart',
  solves,
  groupingPeriod = 'daily',
  periodGroups,
  customBatchSize = 50,
  title = 'Solve Time Distribution Shift',
}) => {
  const { colors } = useTheme();
  const trackGradientId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const latestDeltaSolvesRef = useRef<number>(0);
  const prevCeilingRef = useRef<number>(0.25);

  // Filter valid (non-DNF) solves
  const validSolves = useMemo(() => solves.filter((s) => s.penalty !== 'DNF'), [solves]);
  const totalSolves = validSolves.length;

  // Effective period groups (passed from parent or grouped dynamically)
  const effectivePeriodGroups = useMemo(() => {
    if (periodGroups && periodGroups.length > 0) return periodGroups;
    if (solves.length > 0) {
      return groupSolvesByPeriod(solves, groupingPeriod, customBatchSize);
    }
    return [];
  }, [periodGroups, solves, groupingPeriod, customBatchSize]);

  // Group boundaries for timeline scrubber background vertical lines
  const groupBoundaries = useMemo(() => {
    if (effectivePeriodGroups.length <= 1 || totalSolves === 0) return [];

    const rawBoundaries: Array<{
      solveIndex: number;
      x: number;
      percent: number;
      periodNumber: number;
      label: string;
      nextLabel?: string;
    }> = [];

    let cumulativeCount = 0;
    for (let i = 0; i < effectivePeriodGroups.length - 1; i++) {
      const group = effectivePeriodGroups[i];
      const count =
        group.solves && group.solves.length > 0
          ? group.solves.filter((s) => s.penalty !== 'DNF').length
          : (group.timesSec?.length ?? 0);
      cumulativeCount += count;

      if (cumulativeCount > 0 && cumulativeCount < totalSolves) {
        const percent = (cumulativeCount / totalSolves) * 100;
        const x = (cumulativeCount / totalSolves) * 1000;
        rawBoundaries.push({
          solveIndex: cumulativeCount,
          x,
          percent,
          periodNumber: i + 1,
          label: group.label,
          nextLabel: effectivePeriodGroups[i + 1]?.label,
        });
      }
    }

    if (rawBoundaries.length <= 35) {
      return rawBoundaries;
    }
    const step = Math.ceil(rawBoundaries.length / 35);
    return rawBoundaries.filter((_, idx) => (idx + 1) % step === 0);
  }, [effectivePeriodGroups, totalSolves]);

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
  type DragState = {
    type: 'move' | 'resize-start' | 'resize-end';
    scrubber: 1 | 2;
    startX: number;
    initialStart1: number;
    initialStart2: number;
    initialCount: number;
    trackWidth: number;
    pointerId: number;
  };
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
  const activeDragRef = useRef<DragState | null>(null);
  const { containerRef, tooltipActive, touchHandlers } = useAutoDismissTooltip();

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Dominant peak detection with sub-grid parabolic interpolation for Baseline and Recent curves
  const baselinePeak = useMemo(() => findKDEPeak(kdeData, 'baselineDensity'), [kdeData]);
  const recentPeak = useMemo(() => findKDEPeak(kdeData, 'recentDensity'), [kdeData]);

  // Absolute distance between dominant peaks
  const peakDistance = useMemo(
    () => calculatePeakDistance(baselinePeak, recentPeak),
    [baselinePeak, recentPeak],
  );

  // Height of horizontal distance bar spanning between the peaks
  const peakBarY = useMemo(() => {
    if (!baselinePeak || !recentPeak) return null;
    return Math.max(baselinePeak.density, recentPeak.density);
  }, [baselinePeak, recentPeak]);

  // Position peak labels off-center so the vertical reference line does not cut through the text
  const baselineSide: 'left' | 'right' = useMemo(() => {
    if (!baselinePeak) return 'right';
    if (baselinePeak.index > 105) return 'left';
    if (baselinePeak.index < 15) return 'right';
    if (recentPeak) {
      return baselinePeak.x >= recentPeak.x ? 'right' : 'left';
    }
    return baselinePeak.index >= 60 ? 'left' : 'right';
  }, [baselinePeak, recentPeak]);

  const recentSide: 'left' | 'right' = useMemo(() => {
    if (!recentPeak) return 'left';
    if (recentPeak.index > 105) return 'left';
    if (recentPeak.index < 15) return 'right';
    if (baselinePeak) {
      return baselinePeak.x >= recentPeak.x ? 'left' : 'right';
    }
    return recentPeak.index >= 60 ? 'left' : 'right';
  }, [baselinePeak, recentPeak]);

  const isClosePeaks =
    baselinePeak && recentPeak && Math.abs(baselinePeak.index - recentPeak.index) <= 6;
  const baselineVerticalOffset = 14;
  const recentVerticalOffset = isClosePeaks ? 28 : 14;

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

  // Distribution comparison metrics between Sample 1 (Baseline) and Sample 2 (Recent)
  const metricsSummary = useMemo(() => {
    if (sample1Solves.length === 0 || sample2Solves.length === 0 || validSolves.length < 10) {
      return null;
    }

    const bTimes = sample1Solves.map((s) => s.finalTimeSec);
    const rTimes = sample2Solves.map((s) => s.finalTimeSec);

    const bMean = bTimes.reduce((a, b) => a + b, 0) / bTimes.length;
    const rMean = rTimes.reduce((a, b) => a + b, 0) / rTimes.length;

    const overlap = calculateOverlapCoefficient(kdeData);
    const milestone = selectSpeedcubingMilestone([...bTimes, ...rTimes]);
    const subTarget =
      milestone != null ? calculateSubTargetChance(bTimes, rTimes, milestone) : null;
    const tail = calculateTailRisk(bTimes, rTimes);
    const emd = calculateEarthMoverDistance(kdeData);

    // EMD magnitude is unsigned; derive the direction of travel from the means.
    let shiftText = 'no change';
    if (emd !== null && emd > 0) {
      if (bMean > rMean) {
        shiftText = `${emd.toFixed(2)}s faster`;
      } else if (rMean > bMean) {
        shiftText = `${emd.toFixed(2)}s slower`;
      } else {
        shiftText = `${emd.toFixed(2)}s shift`;
      }
    }

    return {
      overlap,
      subTarget,
      tail,
      shiftText,
      start1Index: start1 + 1,
      end1Index: start1 + sampleCount,
      start2Index: start2 + 1,
      end2Index: start2 + sampleCount,
    };
  }, [sample1Solves, sample2Solves, validSolves.length, start1, start2, sampleCount, kdeData]);

  // Friendly readouts derived from the raw metrics, resolved once per metrics change.
  const metricsDisplay = useMemo(() => {
    if (!metricsSummary) return null;
    const { overlap, subTarget, tail } = metricsSummary;

    return {
      ...metricsSummary,
      overlapText: overlap != null ? formatPercent(overlap) : '—',
      subTargetText: subTarget
        ? `${formatPercent(subTarget.baselineChance)} to ${formatPercent(subTarget.recentChance)}`
        : '—',
      subTargetTone: changeTone(
        subTarget ? subTarget.recentChance - subTarget.baselineChance : null,
        0.02,
      ),
      tailText: formatTailText(tail?.relativeChange ?? null),
      tailTone: changeTone(tail?.relativeChange ?? null, 0.0001, true),
      tailSublabel: tail ? `solves > ${tail.thresholdSec.toFixed(1)}s` : undefined,
    };
  }, [metricsSummary]);

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
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    latestDeltaSolvesRef.current = 0;
    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || 1;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    const dragState: DragState = {
      type: 'move',
      scrubber,
      startX: e.clientX,
      initialStart1: start1,
      initialStart2: start2,
      initialCount: sampleCount,
      trackWidth,
      pointerId: e.pointerId,
    };
    activeDragRef.current = dragState;
    setActiveDrag(dragState);
  };

  // Pointer drag handler for resizing via ribbed ends (symmetrical sample size update)
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    scrubber: 1 | 2,
    edge: 'start' | 'end',
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragMovedRef.current = false;
    latestDeltaSolvesRef.current = 0;
    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || 1;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    const dragState: DragState = {
      type: edge === 'start' ? 'resize-start' : 'resize-end',
      scrubber,
      startX: e.clientX,
      initialStart1: start1,
      initialStart2: start2,
      initialCount: sampleCount,
      trackWidth,
      pointerId: e.pointerId,
    };
    activeDragRef.current = dragState;
    setActiveDrag(dragState);
  };

  const applyDragDelta = useCallback(
    (deltaSolves: number, overrideDrag?: DragState) => {
      const drag = overrideDrag ?? activeDragRef.current;
      if (!drag) return;

      if (drag.type === 'move') {
        const curMaxStart = Math.max(0, totalSolves - drag.initialCount);
        if (drag.scrubber === 1) {
          const newStart1 = Math.max(0, Math.min(curMaxStart, drag.initialStart1 + deltaSolves));
          setStart1State(newStart1);
        } else {
          const newStart2 = Math.max(0, Math.min(curMaxStart, drag.initialStart2 + deltaSolves));
          setStart2State(newStart2);
        }
      } else if (drag.type === 'resize-end') {
        // Dragging right edge: anchor left edge, expand/contract width symmetrically
        if (drag.scrubber === 1) {
          const fixedStart1 = drag.initialStart1;
          const requestedEnd1 = fixedStart1 + drag.initialCount + deltaSolves;
          const clampedEnd1 = Math.max(fixedStart1 + 3, Math.min(totalSolves, requestedEnd1));
          const newCount = clampedEnd1 - fixedStart1;

          setSampleCountState(newCount);
          setStart1State(fixedStart1);
          setStart2State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart));
        } else {
          const fixedStart2 = drag.initialStart2;
          const requestedEnd2 = fixedStart2 + drag.initialCount + deltaSolves;
          const clampedEnd2 = Math.max(fixedStart2 + 3, Math.min(totalSolves, requestedEnd2));
          const newCount = clampedEnd2 - fixedStart2;

          setSampleCountState(newCount);
          setStart2State(fixedStart2);
          setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
        }
      } else if (drag.type === 'resize-start') {
        // Dragging left edge: anchor right edge, expand/contract width symmetrically
        if (drag.scrubber === 1) {
          const fixedEnd1 = drag.initialStart1 + drag.initialCount;
          const requestedStart1 = drag.initialStart1 + deltaSolves;
          const clampedStart1 = Math.max(0, Math.min(fixedEnd1 - 3, requestedStart1));
          const newCount = fixedEnd1 - clampedStart1;

          setSampleCountState(newCount);
          setStart1State(clampedStart1);
          setStart2State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? maxStart));
        } else {
          const fixedEnd2 = drag.initialStart2 + drag.initialCount;
          const requestedStart2 = drag.initialStart2 + deltaSolves;
          const clampedStart2 = Math.max(0, Math.min(fixedEnd2 - 3, requestedStart2));
          const newCount = fixedEnd2 - clampedStart2;

          setSampleCountState(newCount);
          setStart2State(clampedStart2);
          setStart1State((prev) => Math.min(Math.max(0, totalSolves - newCount), prev ?? 0));
        }
      }
    },
    [totalSolves, maxStart],
  );

  const dragMovedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending dragMoved reset timeout on unmount
  useEffect(() => {
    return () => {
      if (dragMovedTimeoutRef.current !== null) {
        clearTimeout(dragMovedTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement> | PointerEvent) => {
      const drag = activeDragRef.current;
      if (drag) {
        activeDragRef.current = null;
        setActiveDrag(null);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        applyDragDelta(latestDeltaSolvesRef.current, drag);
        try {
          const target = (e.currentTarget ?? e.target) as HTMLElement | null;
          if (target && typeof target.releasePointerCapture === 'function') {
            target.releasePointerCapture(drag.pointerId);
          }
        } catch {
          // Safe fallback
        }
        if (dragMovedTimeoutRef.current !== null) {
          clearTimeout(dragMovedTimeoutRef.current);
        }
        dragMovedTimeoutRef.current = setTimeout(() => {
          dragMovedRef.current = false;
          dragMovedTimeoutRef.current = null;
        }, 50);
      }
    },
    [applyDragDelta],
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLElement> | PointerEvent) => {
    const drag = activeDragRef.current;
    if (!drag) return;

    // If mouse or pen button was released without a pointerup event, immediately cancel drag
    if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && (e.buttons & 1) === 0) {
      handlePointerUp(e);
      return;
    }

    const deltaX = e.clientX - drag.startX;
    if (Math.abs(deltaX) > 2) {
      dragMovedRef.current = true;
    }
    const deltaSolves = Math.round((deltaX / drag.trackWidth) * totalSolves);
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
      applyDragDelta(deltaSolves, drag);
    }
  };

  // Window-level safety listeners when dragging to prevent mouse getting stuck
  useEffect(() => {
    if (!activeDrag) return;

    const onWindowPointerUp = (e: PointerEvent) => {
      const currentDrag = activeDragRef.current;
      if (
        currentDrag &&
        (e.pointerId === currentDrag.pointerId ||
          e.pointerType === 'mouse' ||
          e.pointerType === 'pen')
      ) {
        handlePointerUp(e);
      }
    };

    const onWindowPointerMove = (e: PointerEvent) => {
      if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && (e.buttons & 1) === 0) {
        onWindowPointerUp(e);
      }
    };

    const onWindowBlur = (e: FocusEvent) => {
      if (activeDragRef.current) {
        handlePointerUp(e as unknown as PointerEvent);
      }
    };

    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [activeDrag, handlePointerUp]);

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
      <div
        className="max-w-[240px] rounded-xl border p-2.5 text-xs shadow-2xl backdrop-blur-md sm:max-w-xs sm:p-3"
        style={{
          backgroundColor: colors.bgCard,
          borderColor: colors.borderSubtle,
          color: colors.textPrimary,
        }}
      >
        <div
          className="mb-2 flex items-center justify-between gap-2 border-b pb-1.5 font-semibold"
          style={{ borderColor: colors.borderSubtle }}
        >
          <span>Solve Time: {label}s</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full border"
                style={{
                  borderColor: colors.series.blue,
                  backgroundColor: colors.series.blue,
                }}
              />
              <span>Baseline Density:</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: colors.series.blue }}>
              {payload[0]?.value?.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full border"
                style={{
                  borderColor: colors.series.green,
                  backgroundColor: colors.series.green,
                }}
              />
              <span>Recent Density:</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: colors.series.green }}>
              {payload[1]?.value?.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const baselineSeriesName = `Baseline Solves (${start1 + 1}–${start1 + sampleCount})`;
  const recentSeriesName = `Recent Solves (${start2 + 1}–${start2 + sampleCount})`;

  return (
    <ChartCardWrapper
      id={id}
      title={title}
      subtitle="Kernel Density Estimation (KDE) comparison showing probability density shift between any two sampled regions across the session distribution."
      mobileSubtitle="KDE curves showing probability density shifts between sampled solve windows."
      headerBadge={
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={{
            borderColor: `${colors.accent}40`,
            backgroundColor: `${colors.accent}15`,
            color: colors.accentText,
          }}
        >
          <Activity className="h-3.5 w-3.5" style={{ color: colors.accent }} />
          Density Shift
        </span>
      }
      filenamePrefix="density_shift_distribution"
    >
      {/* Distribution comparison metrics: shared identity line plus one tile per metric */}
      {metricsDisplay && (
        <div
          id="density-distribution-metrics"
          className="flex flex-col gap-2 rounded-xl border border-stone-800/70 bg-stone-950/60 p-2.5 text-xs sm:p-3"
          style={{
            backgroundColor: colors.bgSubtle,
            borderColor: colors.borderSubtle,
          }}
        >
          {/* Which solve windows these metrics compare */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.series.blue }}
              />
              <span style={{ color: colors.textSecondary }}>Baseline</span>
              <span
                id="density-range-baseline"
                className="font-mono"
                style={{ color: colors.textMuted }}
              >
                ({metricsDisplay.start1Index}–{metricsDisplay.end1Index})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.series.green }}
              />
              <span style={{ color: colors.textSecondary }}>Recent</span>
              <span
                id="density-range-recent"
                className="font-mono"
                style={{ color: colors.textMuted }}
              >
                ({metricsDisplay.start2Index}–{metricsDisplay.end2Index})
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile
              id="density-metric-overlap"
              label="Overlap"
              value={metricsDisplay.overlapText}
              valueColor={colors.series.teal}
              hint="The share of your solve times that the two periods have in common. A score of 100% means both windows follow the same distribution; lower values mean your times sit in different ranges. It describes how much the distribution changed, not whether that change was good."
              colors={colors}
            />
            <MetricTile
              id="density-metric-sub-target"
              label={
                metricsDisplay.subTarget
                  ? `Sub-${metricsDisplay.subTarget.targetSec} Chance`
                  : 'Sub-X Chance'
              }
              value={metricsDisplay.subTargetText}
              valueColor={toneColor(metricsDisplay.subTargetTone, colors)}
              hint={
                metricsDisplay.subTarget
                  ? `How often you finished under ${metricsDisplay.subTarget.targetSec} seconds in each window. The first value is your earlier period, the second your current one. A higher second value means you're hitting that goal more consistently now.`
                  : "How often you finished under your target time, in each window. The first value is your earlier period, the second your current one. A higher second value means you're hitting that goal more consistently now."
              }
              colors={colors}
            />
            <MetricTile
              id="density-metric-tail"
              label="Slow Solves"
              value={metricsDisplay.tailText}
              valueColor={toneColor(metricsDisplay.tailTone, colors)}
              hint={
                metricsDisplay.tail
                  ? `Tracks how often you produce unusually slow solves. The cutoff is the slowest quarter of your earlier period, so any time above ${metricsDisplay.tail.thresholdSec.toFixed(1)}s counts. 'Fewer' in green means those slow solves became rarer; 'more' in red means they became more common.`
                  : "Tracks how often you produce unusually slow solves, measured against the slowest quarter of your earlier period. 'Fewer' in green means those slow solves became rarer; 'more' in red means they became more common."
              }
              sublabel={metricsDisplay.tailSublabel}
              colors={colors}
            />
            <MetricTile
              id="density-metric-shift"
              label="Distribution Shift"
              value={metricsDisplay.shiftText}
              valueColor={colors.accentText}
              hint="How much your solve times shifted between the two periods, measured in seconds. A result like '4.10s faster' means your times moved toward faster results by roughly 4.10 seconds overall. It captures the shift across your whole range of times, not just the average."
              sublabel="Earth Mover's Distance"
              colors={colors}
            />
          </div>
        </div>
      )}

      {/* Main Area Chart with GPU-composited fluid transitions */}
      <div
        ref={containerRef}
        className={`${isMobileScreen ? 'h-[340px]' : 'h-[360px]'} w-full pt-2 ${
          activeDrag
            ? ''
            : '[&_.recharts-curve]:transition-[d] [&_.recharts-curve]:duration-200 [&_.recharts-curve]:ease-out'
        }`}
        {...touchHandlers}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 800, height: isMobileScreen ? 340 : 360 }}
        >
          <AreaChart
            data={kdeData}
            margin={{
              top: isMobileScreen ? 15 : 20,
              right: isMobileScreen ? 4 : 30,
              left: isMobileScreen ? 4 : 10,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient
                id="colorBaseline"
                key={colors.series.blue}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={colors.series.blue} stopOpacity={0.4} />
                <stop offset="95%" stopColor={colors.series.blue} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient
                id="colorRecent"
                key={colors.series.green}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={colors.series.green} stopOpacity={0.45} />
                <stop offset="95%" stopColor={colors.series.green} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.borderSubtle}
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="x"
              interval={Math.max(1, Math.floor(kdeData.length / (isMobileScreen ? 6 : 8)))}
              stroke={colors.textMuted}
              fontSize={isMobileScreen ? 10 : 11}
              tickLine={false}
              axisLine={{ stroke: colors.borderSubtle }}
              tickFormatter={(v: number) => `${Number(v.toFixed(1))}s`}
              label={{
                value: 'Solve Time (seconds)',
                position: 'insideBottom',
                offset: isMobileScreen ? -10 : -12,
                fill: colors.textMuted,
                fontSize: isMobileScreen ? 11 : 12,
              }}
            />
            <YAxis
              width={isMobileScreen ? 36 : 48}
              domain={[0, yCeiling]}
              allowDataOverflow={false}
              stroke={colors.textMuted}
              fontSize={isMobileScreen ? 10 : 11}
              tickLine={false}
              axisLine={{ stroke: colors.borderSubtle }}
              tickFormatter={(v: number) => {
                if (v === 0) return '0';
                if (yCeiling < 0.02) return v.toFixed(3);
                return v.toFixed(2);
              }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Density',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 5,
                      fill: colors.textMuted,
                      fontSize: 12,
                    }
              }
            />
            <Tooltip
              active={tooltipActive}
              content={<CustomTooltip />}
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                paddingBottom: '12px',
                fontSize: isMobileScreen ? '11px' : '12px',
                color: colors.textSecondary,
              }}
              formatter={(value) => <span style={{ color: colors.textSecondary }}>{value}</span>}
            />

            {/* Baseline Density Area */}
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="baselineDensity"
              name={baselineSeriesName}
              stroke={colors.series.blue}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBaseline)"
            />

            {/* Recent Density Area */}
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="recentDensity"
              name={recentSeriesName}
              stroke={colors.series.green}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRecent)"
            />

            {/* Peak Vertical Reference Lines with off-center labels */}
            {baselinePeak && (
              <ReferenceLine
                x={baselinePeak.x}
                stroke={colors.series.blue}
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={(props: { viewBox?: { x?: number; y?: number } }) => {
                  const { viewBox } = props || {};
                  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number') {
                    return null;
                  }
                  const tx = baselineSide === 'left' ? viewBox.x - 6 : viewBox.x + 6;
                  const ty = viewBox.y + baselineVerticalOffset;
                  const textAnchor = baselineSide === 'left' ? 'end' : 'start';
                  return (
                    <text
                      x={tx}
                      y={ty}
                      fill={colors.series.blue}
                      fontSize={isMobileScreen ? 9 : 10}
                      fontWeight={600}
                      textAnchor={textAnchor}
                    >
                      {`${baselinePeak.interpolatedTime.toFixed(2)}s`}
                    </text>
                  );
                }}
              />
            )}

            {recentPeak && (
              <ReferenceLine
                x={recentPeak.x}
                stroke={colors.series.green}
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={(props: { viewBox?: { x?: number; y?: number } }) => {
                  const { viewBox } = props || {};
                  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number') {
                    return null;
                  }
                  const tx = recentSide === 'left' ? viewBox.x - 6 : viewBox.x + 6;
                  const ty = viewBox.y + recentVerticalOffset;
                  const textAnchor = recentSide === 'left' ? 'end' : 'start';
                  return (
                    <text
                      x={tx}
                      y={ty}
                      fill={colors.series.green}
                      fontSize={isMobileScreen ? 9 : 10}
                      fontWeight={600}
                      textAnchor={textAnchor}
                    >
                      {`${recentPeak.interpolatedTime.toFixed(2)}s`}
                    </text>
                  );
                }}
              />
            )}

            {/* Peak Distance Horizontal Bar with centered distance label */}
            {baselinePeak && recentPeak && peakBarY !== null && peakDistance !== null && (
              <ReferenceLine
                segment={[
                  { x: baselinePeak.x, y: peakBarY },
                  { x: recentPeak.x, y: peakBarY },
                ]}
                stroke={colors.series.amber}
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={(props: {
                  viewBox?: { x?: number; y?: number; width?: number };
                  x?: number;
                  y?: number;
                }) => {
                  const { viewBox } = props || {};
                  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number') {
                    return null;
                  }
                  const lx =
                    typeof props.x === 'number'
                      ? props.x
                      : viewBox.x + (typeof viewBox.width === 'number' ? viewBox.width / 2 : 0);
                  const ly = (typeof props.y === 'number' ? props.y : viewBox.y) - 6;
                  return (
                    <text
                      x={lx}
                      y={ly}
                      fill={colors.series.amber}
                      fontSize={isMobileScreen ? 9 : 10}
                      fontWeight={600}
                      textAnchor="middle"
                    >
                      {`${peakDistance.toFixed(2)}s`}
                    </text>
                  );
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile-only bottom axis title aligned with the graph edges, using graph-matching font & color */}
      {isMobileScreen && (
        <div
          id="density-mobile-axis-title"
          className="-mt-1.5 flex items-center justify-between px-1 text-[11px] leading-tight select-none"
        >
          <span style={{ color: colors.textMuted }}>Density</span>
        </div>
      )}

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
          id="density-scrubber-track"
          className="relative h-12 sm:h-14 md:h-16 lg:h-20 w-full cursor-pointer select-none rounded-xl border border-stone-800 bg-stone-950/90 shadow-inner"
          style={{
            backgroundColor: colors.bgSubtle,
            borderColor: colors.borderSubtle,
          }}
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
                  <stop offset="0%" stopColor={colors.accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <path d={sparklineData.areaPath} fill={`url(#${trackGradientId})`} />
              <path
                d={sparklineData.linePath}
                fill="none"
                stroke={colors.series.neutral}
                strokeWidth="1.5"
                opacity={0.8}
              />
              <line
                x1="0"
                y1={sparklineData.meanY}
                x2="1000"
                y2={sparklineData.meanY}
                stroke={colors.textMuted}
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity={0.6}
              />
              {/* Grouping Aggregation Boundary Vertical Lines */}
              {groupBoundaries.map((b) => (
                <g key={`group-boundary-${b.periodNumber}-${b.solveIndex}`}>
                  <line
                    x1={b.x}
                    y1={0}
                    x2={b.x}
                    y2={72}
                    stroke={colors.series.neutral}
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                    opacity={0.65}
                  />
                  <title>
                    {b.nextLabel
                      ? `${b.label} ended · ${b.nextLabel} began (solve ${b.solveIndex})`
                      : `${b.label} ended (solve ${b.solveIndex})`}
                  </title>
                </g>
              ))}
            </svg>
          )}

          {/* Scrubber 1 (Baseline - Rose with opacity, no text badge) */}
          <div
            id="density-scrubber-baseline"
            tabIndex={0}
            role="slider"
            aria-label="Baseline scrubber position"
            aria-valuenow={start1 + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, totalSolves - sampleCount + 1)}
            style={{
              left: `${leftPercent1}%`,
              width: `${widthPercent}%`,
              borderColor: colors.series.blue,
              backgroundColor: `${colors.series.blue}25`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => handleBodyPointerDown(e, 1)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
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
            className={`group absolute top-0 bottom-0 z-10 flex min-w-[28px] cursor-grab items-center justify-between rounded-lg border-2 shadow-lg backdrop-blur-[1px] touch-none focus:ring-2 focus:outline-none active:cursor-grabbing ${
              activeDrag ? '' : 'transition-all duration-150 ease-out'
            }`}
          >
            {/* Left Ribbed Resize Handle */}
            <button
              id="density-handle-baseline-start"
              type="button"
              style={{ backgroundColor: `${colors.series.blue}15` }}
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-l transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 1, 'start')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
              aria-label="Baseline left resize handle"
              title="Drag to resize sample window"
            >
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.blue }}
              />
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.blue }}
              />
            </button>

            {/* Right Ribbed Resize Handle */}
            <button
              id="density-handle-baseline-end"
              type="button"
              style={{ backgroundColor: `${colors.series.blue}15` }}
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-r transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 1, 'end')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
              aria-label="Baseline right resize handle"
              title="Drag to resize sample window"
            >
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.blue }}
              />
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.blue }}
              />
            </button>
          </div>

          {/* Scrubber 2 (Recent with dynamic theme color) */}
          <div
            id="density-scrubber-recent"
            tabIndex={0}
            role="slider"
            aria-label="Recent scrubber position"
            aria-valuenow={start2 + 1}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, totalSolves - sampleCount + 1)}
            style={{
              left: `${leftPercent2}%`,
              width: `${widthPercent}%`,
              borderColor: colors.series.green,
              backgroundColor: `${colors.series.green}25`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => handleBodyPointerDown(e, 2)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
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
            className={`group absolute top-0 bottom-0 z-20 flex min-w-[28px] cursor-grab items-center justify-between rounded-lg border-2 shadow-lg backdrop-blur-[1px] touch-none focus:ring-2 focus:outline-none active:cursor-grabbing ${
              activeDrag ? '' : 'transition-all duration-150 ease-out'
            }`}
          >
            {/* Left Ribbed Resize Handle */}
            <button
              id="density-handle-recent-start"
              type="button"
              style={{ backgroundColor: `${colors.series.green}15` }}
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-l transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 2, 'start')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
              aria-label="Recent left resize handle"
              title="Drag to resize sample window"
            >
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.green }}
              />
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.green }}
              />
            </button>

            {/* Right Ribbed Resize Handle */}
            <button
              id="density-handle-recent-end"
              type="button"
              style={{ backgroundColor: `${colors.series.green}15` }}
              className="group/handle flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center gap-[2px] rounded-r transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => handleResizePointerDown(e, 2, 'end')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
              aria-label="Recent right resize handle"
              title="Drag to resize sample window"
            >
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.green }}
              />
              <span
                className="h-3.5 sm:h-4 w-[1.5px] rounded-full transition-all group-hover/handle:brightness-125 group-hover/handle:scale-y-110"
                style={{ backgroundColor: colors.series.green }}
              />
            </button>
          </div>
        </section>

        {/* Track Timeline Labels */}
        <div
          className="flex items-center justify-between px-1 text-[11px] text-stone-500"
          style={{ color: colors.textMuted }}
        >
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
