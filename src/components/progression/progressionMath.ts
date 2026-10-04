import type { LinearRegression, PeriodGroup, Solve } from '../../types';
import { calculateAoN } from '../../utils/statsMath';
import type {
  PeriodBoundaryItem,
  ProgressionDataPoint,
  RangeMode,
  ResponsiveBoundaryInfo,
  SingleLineStyle,
  SolveVisibilityMode,
} from './types';

export function filterSolvesByRange(
  solves: Solve[],
  rangeMode: RangeMode,
  startSolve: number,
  endSolve: number,
  startDate: string,
  endDate: string,
): Solve[] {
  if (solves.length === 0) return [];

  if (rangeMode === 'dateRange') {
    if (!startDate && !endDate) return solves;
    return solves.filter((s) => {
      const sDate = s.dateStr;
      const afterStart = !startDate || sDate >= startDate;
      const beforeEnd = !endDate || sDate <= endDate;
      return afterStart && beforeEnd;
    });
  }

  if (rangeMode === 'solveIndex') {
    const totalCount = solves.length;
    const clampedStart = Math.max(1, Math.min(startSolve, endSolve));
    const clampedEnd = Math.min(totalCount, Math.max(startSolve, endSolve));
    return solves.filter((s) => s.index >= clampedStart && s.index <= clampedEnd);
  }

  return solves;
}

export function buildSolvePeriodMap(
  periodGroups: PeriodGroup[],
  unitSingular: string,
): Map<number, { periodNumber: number; periodLabel: string }> {
  const solvePeriodMap = new Map<number, { periodNumber: number; periodLabel: string }>();
  periodGroups.forEach((group, gIdx) => {
    group.solves.forEach((s) => {
      solvePeriodMap.set(s.index, {
        periodNumber: gIdx + 1,
        periodLabel: group.label || `${unitSingular} ${gIdx + 1}`,
      });
    });
  });
  return solvePeriodMap;
}

export function buildProgressionChartData(
  filteredSolves: Solve[],
  fullSolves: Solve[],
  filteredRegression: LinearRegression,
  solvePeriodMap: Map<number, { periodNumber: number; periodLabel: string }>,
  showCustomAo: boolean,
  customAoN: number,
): ProgressionDataPoint[] {
  // Precompute O(1) index lookup map: solve.id -> fullSolves array index
  const fullIdxMap = new Map<number, number>();
  for (let i = 0; i < fullSolves.length; i++) {
    const id = fullSolves[i].id;
    if (!fullIdxMap.has(id)) {
      fullIdxMap.set(id, i);
    }
  }

  return filteredSolves.map((solve) => {
    const fullIdx = fullIdxMap.get(solve.id) ?? -1;
    const predY = filteredRegression.slope * solve.index + filteredRegression.intercept;

    const ao5 = solve.ao5 ?? calculateAoN(fullSolves, fullIdx, 5);
    const ao12 = solve.ao12 ?? calculateAoN(fullSolves, fullIdx, 12);
    const ao50 = solve.ao50 ?? calculateAoN(fullSolves, fullIdx, 50);
    const ao100 = solve.ao100 ?? calculateAoN(fullSolves, fullIdx, 100);
    const customAo =
      showCustomAo && customAoN >= 3 ? calculateAoN(fullSolves, fullIdx, customAoN) : null;
    const pInfo = solvePeriodMap.get(solve.index);

    return {
      index: solve.index,
      single: solve.penalty === 'DNF' ? null : solve.finalTimeSec,
      ao5,
      ao12,
      ao50,
      ao100,
      customAo,
      trend: Number(predY.toFixed(2)),
      dateStr: solve.dateStr,
      scramble: solve.scramble,
      penalty: solve.penalty,
      periodNumber: pInfo?.periodNumber,
      periodLabel: pInfo?.periodLabel,
    };
  });
}

export function calculateRangeStats(filteredSolves: Solve[], totalCount: number) {
  const validTimes = filteredSolves.filter((s) => s.penalty !== 'DNF').map((s) => s.finalTimeSec);
  const count = filteredSolves.length;
  const isFiltered = count < totalCount;
  const meanSec =
    validTimes.length > 0
      ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(2)
      : '-';
  const bestSec = validTimes.length > 0 ? Math.min(...validTimes).toFixed(2) : '-';
  const pctOfTotal = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '100';

  return {
    count,
    isFiltered,
    meanSec,
    bestSec,
    pctOfTotal,
  };
}

export function computeRawPeriodBoundaries(
  periodGroups: PeriodGroup[],
  filteredSolves: Solve[],
  unitSingular: string,
): PeriodBoundaryItem[] {
  const rawPeriodBoundaries: PeriodBoundaryItem[] = [];
  let boundaryAcc = 0;
  periodGroups.forEach((group, idx) => {
    const count = group.solves.length;
    boundaryAcc += count;
    const periodNumber = idx + 1;
    const inRange = filteredSolves.some((s) => s.index === boundaryAcc);
    if (inRange) {
      rawPeriodBoundaries.push({
        index: boundaryAcc,
        periodNumber,
        label: `${unitSingular} ${periodNumber}`,
        groupLabel: group.label,
        midIndex: Math.round(boundaryAcc - count / 2),
      });
    }
  });
  return rawPeriodBoundaries;
}

export function downsampleBoundaryTicks(
  rawPeriodBoundaries: PeriodBoundaryItem[],
  windowWidth: number,
): ResponsiveBoundaryInfo {
  const totalCount = rawPeriodBoundaries.length;
  if (totalCount === 0) {
    return { boundaries: [], step: 1, isDownsampled: false, totalCount };
  }

  // Since tick labels are rotated vertically, each tick needs only ~15px horizontal spacing
  const minLabelWidth = 15;
  const estimatedChartWidth = Math.max(280, Math.min(windowWidth - 70, 1150));
  const maxTicks = Math.max(2, Math.floor(estimatedChartWidth / minLabelWidth));

  if (totalCount <= maxTicks) {
    return { boundaries: rawPeriodBoundaries, step: 1, isDownsampled: false, totalCount };
  }

  // Compute minimal integer step to maximize displayed ticks without text collision
  const step = Math.ceil(totalCount / maxTicks);

  let filtered = rawPeriodBoundaries.filter((b) => b.periodNumber % step === 0);
  if (filtered.length === 0) {
    filtered = rawPeriodBoundaries.filter((_, idx) => idx % step === 0);
  }

  return {
    boundaries: filtered,
    step,
    isDownsampled: true,
    totalCount,
  };
}

export function calculateProgressionYDomain(
  chartData: ProgressionDataPoint[],
  options: {
    solveVisibility: SolveVisibilityMode;
    showAo5: boolean;
    showAo12: boolean;
    showAo50: boolean;
    showAo100: boolean;
    showCustomAo: boolean;
    showTrend: boolean;
  },
): { minY: number; maxY: number } {
  const yValues: number[] = [];
  chartData.forEach((dp) => {
    if (options.solveVisibility !== 'hidden' && dp.single !== null) yValues.push(dp.single);
    if (options.showAo5 && dp.ao5 !== null) yValues.push(dp.ao5);
    if (options.showAo12 && dp.ao12 !== null) yValues.push(dp.ao12);
    if (options.showAo50 && dp.ao50 !== null) yValues.push(dp.ao50);
    if (options.showAo100 && dp.ao100 !== null) yValues.push(dp.ao100);
    if (options.showCustomAo && dp.customAo !== null) yValues.push(dp.customAo);
    if (options.showTrend && dp.trend !== null) yValues.push(dp.trend);
  });

  const minY = yValues.length > 0 ? Math.max(0, Math.floor(Math.min(...yValues) - 2)) : 0;
  const maxY = yValues.length > 0 ? Math.ceil(Math.max(...yValues) + 3) : 50;

  return { minY, maxY };
}

export function getSingleLineStyle(
  solveVisibility: SolveVisibilityMode,
  customColors?: { stroke?: string; dotFill?: string; dotStroke?: string },
): SingleLineStyle {
  const strokeUnmuted = customColors?.stroke ?? '#94a3b8';
  const dotFillUnmuted = customColors?.dotFill ?? '#cbd5e1';
  const dotStrokeUnmuted = customColors?.dotStroke ?? '#64748b';

  switch (solveVisibility) {
    case 'hidden':
      return {
        stroke: 'transparent',
        strokeWidth: 0,
        strokeOpacity: 0,
        dot: false,
      };
    case 'unmuted':
    case 'visible':
      return {
        stroke: strokeUnmuted,
        strokeWidth: 1,
        strokeOpacity: 0.6,
        dot: { r: 2.5, fill: dotFillUnmuted, stroke: dotStrokeUnmuted, strokeWidth: 0.5 },
      };
    case 'dots':
      return {
        stroke: dotStrokeUnmuted,
        strokeWidth: 0.75,
        strokeOpacity: 0.25,
        dot: { r: 1.2, fill: strokeUnmuted, fillOpacity: 0.35, stroke: 'none' },
      };
    default:
      return {
        stroke: dotStrokeUnmuted,
        strokeWidth: 0.75,
        strokeOpacity: 0.35,
        dot: false,
      };
  }
}
