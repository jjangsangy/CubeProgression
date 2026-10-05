import type {
  GlobalStats,
  GroupingPeriod,
  KDEPeak,
  KDEPoint,
  LinearRegression,
  PbDataPoint,
  PbMilestone,
  PbProgressionResult,
  PeriodGroup,
  Solve,
  SubTargetChance,
  TailRiskMetrics,
} from '../types';

/**
 * Calculates official WCA Average of N (Ao5, Ao12, Ao50) ending at solve index
 */
export function calculateAoN(solves: Solve[], currentIndex: number, n: number): number | null {
  if (currentIndex < n - 1 || currentIndex >= solves.length) return null;

  const window = solves.slice(currentIndex - n + 1, currentIndex + 1);
  const times: number[] = [];
  let dnfCount = 0;

  for (const s of window) {
    if (s.penalty === 'DNF') {
      dnfCount++;
    } else {
      times.push(s.finalTimeSec);
    }
  }

  // WCA rule: Max 1 DNF allowed for N <= 12, max 5% for larger N
  const maxAllowedDnf = Math.floor(n * 0.05) || 1;
  if (dnfCount > maxAllowedDnf) {
    return null; // DNF average
  }

  // Sort valid times
  times.sort((a, b) => a - b);

  // Number of trim items from top and bottom (5% or 1 minimum)
  const trimCount = Math.max(1, Math.floor(n * 0.05));

  // If we had DNFs, they act as the worst times
  const effectiveTimes = [...times];
  // Add sentinel high values for DNFs at the end
  for (let i = 0; i < dnfCount; i++) {
    effectiveTimes.push(Infinity);
  }

  // Trim best `trimCount` and worst `trimCount`
  const trimmed = effectiveTimes.slice(trimCount, n - trimCount);

  if (trimmed.length === 0 || trimmed.some((t) => !Number.isFinite(t))) {
    return null;
  }

  const sum = trimmed.reduce((acc, val) => acc + val, 0);
  return Number((sum / trimmed.length).toFixed(2));
}

/**
 * Fits Ordinary Least Squares (OLS) Linear Regression: y = slope * x + intercept
 */
export function calculateLinearRegression(solves: Solve[]): LinearRegression {
  const validSolves = solves.filter((s) => s.penalty !== 'DNF');
  const n = validSolves.length;

  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0, slopeFormatted: '0.0000s/solve' };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = validSolves[i].index;
    const y = validSolves[i].finalTimeSec;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const numerator = sumXY - n * meanX * meanY;
  const denominator = sumX2 - n * meanX * meanX;

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R2 score
  let totalSS = 0;
  let resSS = 0;
  for (let i = 0; i < n; i++) {
    const x = validSolves[i].index;
    const y = validSolves[i].finalTimeSec;
    const predY = slope * x + intercept;

    totalSS += (y - meanY) ** 2;
    resSS += (y - predY) ** 2;
  }

  const r2 = totalSS !== 0 ? Math.max(0, 1 - resSS / totalSS) : 0;
  const sign = slope > 0 ? '+' : '';
  const slopeFormatted = `${sign}${slope.toFixed(4)}s/solve`;

  return {
    slope,
    intercept,
    r2,
    slopeFormatted,
  };
}

/**
 * Calculates statistical metrics (Mean, Median, Q1, Q3, IQR, Whiskers, Outliers, StdDev) for a group of times
 */
export function computeGroupStats(
  groupSolves: Solve[],
  label: string,
  startDate: string,
  endDate: string,
): PeriodGroup {
  const validTimes = groupSolves
    .filter((s) => s.penalty !== 'DNF')
    .map((s) => s.finalTimeSec)
    .sort((a, b) => a - b);

  if (validTimes.length === 0) {
    return {
      label,
      startDate,
      endDate,
      solves: groupSolves,
      timesSec: [],
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      whiskerLow: 0,
      whiskerHigh: 0,
      outliers: [],
    };
  }

  const mean = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  const min = validTimes[0];
  const max = validTimes[validTimes.length - 1];

  // Median and Quantiles
  const getQuantile = (arr: number[], q: number) => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    } else {
      return arr[base];
    }
  };

  const median = getQuantile(validTimes, 0.5);
  const q1 = getQuantile(validTimes, 0.25);
  const q3 = getQuantile(validTimes, 0.75);
  const iqr = q3 - q1;

  // Whiskers definition (1.5 * IQR)
  const lowLimit = q1 - 1.5 * iqr;
  const highLimit = q3 + 1.5 * iqr;

  let whiskerLow = q1;
  for (let i = 0; i < validTimes.length; i++) {
    if (validTimes[i] >= lowLimit) {
      whiskerLow = validTimes[i];
      break;
    }
  }

  let whiskerHigh = q3;
  for (let i = validTimes.length - 1; i >= 0; i--) {
    if (validTimes[i] <= highLimit) {
      whiskerHigh = validTimes[i];
      break;
    }
  }

  const outliers = validTimes.filter((t) => t < lowLimit || t > highLimit);

  // Standard deviation
  const variance = validTimes.reduce((acc, val) => acc + (val - mean) ** 2, 0) / validTimes.length;
  const stdDev = Math.sqrt(variance);

  return {
    label,
    startDate,
    endDate,
    solves: groupSolves,
    timesSec: validTimes,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    whiskerLow: Number(whiskerLow.toFixed(2)),
    whiskerHigh: Number(whiskerHigh.toFixed(2)),
    outliers: outliers.map((o) => Number(o.toFixed(2))),
  };
}

/**
 * Helper to get period unit strings, axis labels, and adjectives based on selected GroupingPeriod
 */
export function getPeriodUnitInfo(period: GroupingPeriod | string, customBatchSize?: number) {
  switch (period) {
    case 'weekly':
      return {
        unitSingular: 'Week',
        unitPlural: 'Weeks',
        adjective: 'Weekly',
        axisLabel: 'Week',
        solvesPerUnit: 'solves/week',
      };
    case 'monthly':
      return {
        unitSingular: 'Month',
        unitPlural: 'Months',
        adjective: 'Monthly',
        axisLabel: 'Month',
        solvesPerUnit: 'solves/month',
      };
    case 'customBatch':
    case 'batch50':
      return {
        unitSingular: 'Batch',
        unitPlural: 'Batches',
        adjective: 'Batch',
        axisLabel: 'Batch',
        solvesPerUnit: customBatchSize ? `solves/batch (${customBatchSize})` : 'solves/batch',
      };
    default:
      return {
        unitSingular: 'Day',
        unitPlural: 'Days',
        adjective: 'Daily',
        axisLabel: 'Day',
        solvesPerUnit: 'solves/day',
      };
  }
}

/**
 * Groups solves by selected period (Daily, Weekly, Monthly, or Custom Batch of N solves)
 */
export function groupSolvesByPeriod(
  solves: Solve[],
  period: GroupingPeriod,
  customBatchSize: number = 50,
): PeriodGroup[] {
  if (solves.length === 0) return [];

  if (period === 'batch50' || period === 'customBatch') {
    const groups: PeriodGroup[] = [];
    const batchSize = period === 'batch50' ? 50 : Math.max(1, customBatchSize);
    const totalBatches = Math.ceil(solves.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const slice = solves.slice(i * batchSize, (i + 1) * batchSize);
      const label = `Batch ${i + 1} (${i * batchSize + 1}-${Math.min((i + 1) * batchSize, solves.length)})`;
      const startDate = slice[0].dateStr;
      const endDate = slice[slice.length - 1].dateStr;

      groups.push(computeGroupStats(slice, label, startDate, endDate));
    }
    return groups;
  }

  // Time-based grouping
  const mapKeyToSolves = new Map<string, Solve[]>();
  const mapKeyToDates = new Map<string, { start: string; end: string; label: string }>();

  solves.forEach((s) => {
    const dateStr = s.dateStr;
    let key = '';
    let label = '';

    if (period === 'daily') {
      key = dateStr;
      label = dateStr;
    } else if (period === 'weekly') {
      const plainDate = Temporal.PlainDate.from(dateStr);
      const weekNum = plainDate.weekOfYear;
      const weekYear = plainDate.yearOfWeek ?? plainDate.year;
      key = `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
      label = `Week ${weekNum} (${weekYear})`;
    } else if (period === 'monthly') {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const plainDate = Temporal.PlainDate.from(dateStr);
      key = `${plainDate.year}-${String(plainDate.month).padStart(2, '0')}`;
      label = `${monthNames[plainDate.month - 1]} ${plainDate.year}`;
    }

    if (!mapKeyToSolves.has(key)) {
      mapKeyToSolves.set(key, []);
      mapKeyToDates.set(key, { start: dateStr, end: dateStr, label });
    }

    const solvesList = mapKeyToSolves.get(key);
    if (solvesList) {
      solvesList.push(s);
    }
    const dateRange = mapKeyToDates.get(key);
    if (dateRange) {
      if (dateStr < dateRange.start) dateRange.start = dateStr;
      if (dateStr > dateRange.end) dateRange.end = dateStr;
    }
  });

  // Convert to array sorted chronologically
  const sortedKeys = Array.from(mapKeyToSolves.keys()).sort();

  // Generate friendly period group display labels
  const result: PeriodGroup[] = [];
  sortedKeys.forEach((key, index) => {
    const groupSolves = mapKeyToSolves.get(key);
    const info = mapKeyToDates.get(key);
    if (!groupSolves || !info) return;

    let displayLabel = info.label;
    if (period === 'daily') {
      displayLabel = `Day ${index + 1} (${info.label})`;
    } else if (period === 'weekly') {
      displayLabel = `Week ${index + 1} (${info.label})`;
    } else if (period === 'monthly') {
      displayLabel = `Month ${index + 1} (${info.label})`;
    }

    result.push(computeGroupStats(groupSolves, displayLabel, info.start, info.end));
  });

  return result;
}

/**
 * Calculates Kernel Density Estimation (KDE) curve points comparing Baseline vs Recent solves
 */
/**
 * Calculates a clean, normalized Y-axis ceiling for probability density plots.
 * Ensures peaks consistently occupy ~70-80% of chart height regardless of sample size or variance,
 * preventing peaks from being too small (flat) or too large (clipping).
 */
export function getNormalizedYCeiling(maxDensity: number): number {
  if (!Number.isFinite(maxDensity) || maxDensity <= 0) return 0.2;

  // Target peak height at ~75-80% of chart height (1.25x headroom)
  const target = maxDensity * 1.25;

  // Determine a clean tick step magnitude
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;

  let step: number;
  if (normalized <= 1.5) {
    step = 0.2 * magnitude;
  } else if (normalized <= 3) {
    step = 0.5 * magnitude;
  } else if (normalized <= 7) {
    step = 1.0 * magnitude;
  } else {
    step = 2.0 * magnitude;
  }

  const ceiling = Math.ceil(target / step) * step;
  return Number(ceiling.toFixed(4));
}

/**
 * Calculates a normalized Y-axis ceiling with hysteresis damping to eliminate
 * scale oscillation/stuttering while moving scrubbers.
 */
export function getNormalizedYCeilingWithHysteresis(
  maxDensity: number,
  currentCeiling: number,
): number {
  if (!Number.isFinite(maxDensity) || maxDensity <= 0) return 0.2;
  const target = getNormalizedYCeiling(maxDensity);

  if (!Number.isFinite(currentCeiling) || currentCeiling <= 0) return target;

  // If peak exceeds 90% of current ceiling, expand immediately to prevent clipping
  if (maxDensity > currentCeiling * 0.9) {
    return Math.max(currentCeiling, target);
  }

  // If peak is still comfortably between 50% and 88% of current ceiling, keep current ceiling
  // to prevent jittery oscillation
  const ratio = maxDensity / currentCeiling;
  if (ratio >= 0.5 && ratio <= 0.88) {
    return currentCeiling;
  }

  return target;
}

/**
 * Calculates KDE probability density estimates for two arbitrary solve sample sets
 */
export function calculateKDEFromSamples(
  sample1: Solve[],
  sample2: Solve[],
  numPoints = 100,
  domain?: { minTime: number; maxTime: number },
): KDEPoint[] {
  const baselineTimes = sample1.filter((s) => s.penalty !== 'DNF').map((s) => s.finalTimeSec);
  const recentTimes = sample2.filter((s) => s.penalty !== 'DNF').map((s) => s.finalTimeSec);

  if (baselineTimes.length === 0 || recentTimes.length === 0) return [];

  // Determine min and max X values: use stable domain if provided, otherwise compute from samples
  const allTimes = [...baselineTimes, ...recentTimes];
  const minTime =
    domain?.minTime !== undefined ? domain.minTime : Math.max(0, Math.min(...allTimes) - 3);
  const maxTime = domain?.maxTime !== undefined ? domain.maxTime : Math.max(...allTimes) + 5;

  // Silverman's Rule of Thumb for Gaussian kernel bandwidth calculation
  const getBandwidth = (times: number[]) => {
    if (times.length < 2) return 1.5;
    const n = times.length;
    const mean = times.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(times.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    return Math.max(0.8, 1.06 * (std || 1) * n ** -0.2);
  };

  const bwBaseline = getBandwidth(baselineTimes);
  const bwRecent = getBandwidth(recentTimes);

  // Gaussian Kernel function
  const gaussianKernel = (u: number) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);

  const evaluateKDE = (x: number, times: number[], bw: number) => {
    let sum = 0;
    for (let i = 0; i < times.length; i++) {
      sum += gaussianKernel((x - times[i]) / bw);
    }
    return sum / (times.length * bw);
  };

  const points: KDEPoint[] = [];
  const step = (maxTime - minTime) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = minTime + i * step;
    const bDensity = evaluateKDE(x, baselineTimes, bwBaseline);
    const rDensity = evaluateKDE(x, recentTimes, bwRecent);

    points.push({
      x: Number(x.toFixed(2)),
      baselineDensity: Number(bDensity.toFixed(4)),
      recentDensity: Number(rDensity.toFixed(4)),
    });
  }

  return points;
}

/**
 * Calculates Kernel Density Estimation (KDE) over solve times to compare distribution
 * between early session (baseline) and late session (fatigue/peak).
 */
export function calculateKDE(
  solves: Solve[],
  baselinePercent = 0.3,
  recentPercent = 0.3,
  numPoints = 100,
): KDEPoint[] {
  const validSolves = solves.filter((s) => s.penalty !== 'DNF');
  if (validSolves.length < 5) return [];

  const splitBaselineIndex = Math.max(3, Math.floor(validSolves.length * baselinePercent));
  const splitRecentIndex = Math.min(
    validSolves.length - 3,
    Math.floor(validSolves.length * (1 - recentPercent)),
  );

  return calculateKDEFromSamples(
    validSolves.slice(0, splitBaselineIndex),
    validSolves.slice(splitRecentIndex),
    numPoints,
  );
}

/**
 * Detects the dominant peak of a KDE curve using discrete argmax
 * followed by parabolic sub-grid interpolation for sub-millisecond precision.
 * Runs in O(M) time where M is the number of grid points (~120).
 *
 * @param points - Array of KDE data points
 * @param key - Density property to evaluate ('baselineDensity' or 'recentDensity')
 * @returns KDEPeak object containing both grid-snapped x coordinate and interpolated peak time, or null if no valid peak
 */
export function findKDEPeak(
  points: KDEPoint[],
  key: 'baselineDensity' | 'recentDensity',
): KDEPeak | null {
  if (!points || points.length === 0) return null;

  let maxIdx = 0;
  let maxY = points[0][key];

  for (let i = 1; i < points.length; i++) {
    const y = points[i][key];
    if (y > maxY) {
      maxY = y;
      maxIdx = i;
    }
  }

  // Guard against all-zero or non-positive distributions
  if (!Number.isFinite(maxY) || maxY <= 0) return null;

  // Boundary peak: cannot interpolate with neighbors
  if (maxIdx === 0 || maxIdx === points.length - 1) {
    return {
      x: points[maxIdx].x,
      interpolatedTime: points[maxIdx].x,
      density: maxY,
      index: maxIdx,
    };
  }

  // 3-point parabolic interpolation around discrete peak
  const y0 = points[maxIdx - 1][key];
  const y1 = points[maxIdx][key];
  const y2 = points[maxIdx + 1][key];

  // Guard against non-finite neighbor densities
  if (!Number.isFinite(y0) || !Number.isFinite(y2)) {
    return {
      x: points[maxIdx].x,
      interpolatedTime: points[maxIdx].x,
      density: y1,
      index: maxIdx,
    };
  }

  const denom = 2 * (y0 - 2 * y1 + y2);

  if (Math.abs(denom) < 1e-12) {
    return {
      x: points[maxIdx].x,
      interpolatedTime: points[maxIdx].x,
      density: y1,
      index: maxIdx,
    };
  }

  // Fractional offset delta clamped to [-0.5, 0.5]
  const rawDelta = (y0 - y2) / denom;
  const delta = Math.max(-0.5, Math.min(0.5, rawDelta));
  // Use centered step across neighboring intervals to normalize discretization step
  const dx = (points[maxIdx + 1].x - points[maxIdx - 1].x) / 2;
  const peakTime = points[maxIdx].x + delta * dx;
  const peakDensity = y1 - 0.25 * (y0 - y2) * delta;

  return {
    x: points[maxIdx].x,
    interpolatedTime: Number(peakTime.toFixed(2)),
    density: Number(peakDensity.toFixed(4)),
    index: maxIdx,
  };
}

/**
 * Calculates the absolute distance in solve time (seconds) between two KDE peaks.
 * Returns null if either peak is null.
 *
 * @param peak1 - First KDE peak
 * @param peak2 - Second KDE peak
 */
export function calculatePeakDistance(peak1: KDEPeak | null, peak2: KDEPeak | null): number | null {
  if (!peak1 || !peak2) return null;
  if (!Number.isFinite(peak1.interpolatedTime) || !Number.isFinite(peak2.interpolatedTime)) {
    return null;
  }
  return Number(Math.abs(peak1.interpolatedTime - peak2.interpolatedTime).toFixed(2));
}

/**
 * Calculates the Earth Mover's Distance (Wasserstein-1 metric, W1) between
 * baseline and recent KDE curves by integrating the L1 difference of their
 * normalized Cumulative Distribution Functions (CDFs):
 *
 *   W1 = \int |F_baseline(x) - F_recent(x)| dx
 *
 * Runs in O(M) time where M is the number of grid points (~120), requiring zero
 * allocations and under 1 microsecond execution time.
 *
 * @param points - Array of evaluated KDE data points containing baselineDensity and recentDensity
 * @returns Earth Mover's Distance in seconds rounded to 2 decimal places, or null if points are invalid
 */
export function calculateEarthMoverDistance(points: KDEPoint[]): number | null {
  if (!points || points.length < 2) return null;

  const n = points.length;
  const dx = (points[n - 1].x - points[0].x) / (n - 1);
  if (dx <= 0 || !Number.isFinite(dx)) return null;

  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < n; i++) {
    sum1 += points[i].baselineDensity;
    sum2 += points[i].recentDensity;
  }

  if (sum1 <= 0 || sum2 <= 0 || !Number.isFinite(sum1) || !Number.isFinite(sum2)) {
    return null;
  }

  let cdf1 = 0;
  let cdf2 = 0;
  let totalL1 = 0;

  for (let i = 0; i < n; i++) {
    cdf1 += points[i].baselineDensity / sum1;
    cdf2 += points[i].recentDensity / sum2;
    totalL1 += Math.abs(cdf1 - cdf2);
  }

  return Number((totalL1 * dx).toFixed(2));
}

/**
 * Overlap coefficient (Weitzman's measure, OVL) between the baseline and recent
 * KDE curves: the shared probability mass of the two normalized densities.
 *
 *   OVL = \int min(f_baseline(x), f_recent(x)) dx
 *
 * Evaluates on precomputed KDE bins in O(M) time with zero heap allocations,
 * keeping it cheap enough for 60 FPS scrubber dragging.
 *
 * @param points - Precomputed KDE data points
 * @returns Overlap in [0, 1] (1 = identical distributions), or null when invalid
 */
export function calculateOverlapCoefficient(points: KDEPoint[]): number | null {
  if (!points || points.length < 2) return null;

  let sumBaseline = 0;
  let sumRecent = 0;
  for (let i = 0; i < points.length; i++) {
    sumBaseline += points[i].baselineDensity;
    sumRecent += points[i].recentDensity;
  }

  if (
    sumBaseline <= 0 ||
    sumRecent <= 0 ||
    !Number.isFinite(sumBaseline) ||
    !Number.isFinite(sumRecent)
  ) {
    return null;
  }

  let overlap = 0;
  for (let i = 0; i < points.length; i++) {
    const baseline = points[i].baselineDensity / sumBaseline;
    const recent = points[i].recentDensity / sumRecent;
    overlap += baseline < recent ? baseline : recent;
  }

  return Math.min(1, Math.max(0, overlap));
}

/**
 * Linear-interpolated quantile for a pre-sorted ascending array (type-7, matching
 * `computeGroupStats`). Shared by the milestone and tail metrics.
 */
function quantileSorted(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const upper = sorted[base + 1];
  return upper !== undefined ? sorted[base] + rest * (upper - sorted[base]) : sorted[base];
}

/**
 * Canonical speedcubing milestone times (seconds), slowest to fastest. Goals are
 * spaced the way cubers actually chase them — 30s steps at the slow end (120/90/60),
 * 5s steps down to 20s, then tighter steps as times get faster — so "sub-15",
 * "sub-8", "sub-5" etc. stay recognizable instead of landing on arbitrary values
 * like "sub-3.3". The ladder keeps going below one second (`0.5`, `0.25`) for
 * last-layer / algorithm-set practice.
 */
export const SPEEDCUBING_MILESTONES_SEC: readonly number[] = [
  120, 90, 60, 50, 45, 40, 35, 30, 25, 20, 15, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5, 0.25,
];

/**
 * Picks the single standard milestone a solver is chasing next: the largest
 * canonical goal strictly faster than their typical (median) solve time, so a
 * ~12s solver is measured on sub-11 rather than an arbitrary threshold. Falls
 * back to the fastest milestone when the median is already world-class.
 *
 * @param times - Solve times used to locate the solver's level (typically recent solves)
 * @returns A milestone time in seconds, or null when there are no times
 */
export function selectSpeedcubingMilestone(times: number[]): number | null {
  const ladder = SPEEDCUBING_MILESTONES_SEC;
  if (times.length === 0) return null;

  const median = quantileSorted(
    times.slice().sort((a, b) => a - b),
    0.5,
  );

  for (let i = 0; i < ladder.length; i++) {
    if (ladder[i] < median) return ladder[i];
  }

  // Median is faster than every milestone on the ladder — use the hardest goal.
  return ladder[ladder.length - 1] ?? null;
}

/**
 * Probability of beating a fixed sub-x target in each sample.
 *
 * @param sample1 - Baseline solve times in seconds
 * @param sample2 - Recent solve times in seconds
 * @param targetSec - Goal time in seconds (e.g. `15` for sub-15)
 * @returns Both sub-target probabilities, or null when invalid
 */
export function calculateSubTargetChance(
  sample1: number[],
  sample2: number[],
  targetSec: number,
): SubTargetChance | null {
  if (sample1.length === 0 || sample2.length === 0 || !Number.isFinite(targetSec)) return null;

  let baselineFast = 0;
  for (let i = 0; i < sample1.length; i++) {
    if (sample1[i] < targetSec) baselineFast++;
  }

  let recentFast = 0;
  for (let i = 0; i < sample2.length; i++) {
    if (sample2[i] < targetSec) recentFast++;
  }

  return {
    targetSec,
    baselineChance: baselineFast / sample1.length,
    recentChance: recentFast / sample2.length,
  };
}

/**
 * Quantifies the change in "bad solve" frequency between two samples. The slow
 * cutoff is the baseline sample's upper quartile (75th percentile), anchoring
 * the baseline bad-solve rate near 25% so the recent window is measured against
 * the same bar regardless of how the distributions shift.
 *
 * @param sample1 - Baseline solve times in seconds
 * @param sample2 - Recent solve times in seconds
 * @param quantile - Tail cutoff quantile applied to the baseline sample
 * @returns Threshold, both tail fractions, and their relative change
 */
export function calculateTailRisk(
  sample1: number[],
  sample2: number[],
  quantile = 0.75,
): TailRiskMetrics | null {
  if (sample1.length === 0 || sample2.length === 0) return null;

  const baseline = sample1.slice().sort((a, b) => a - b);
  const threshold = quantileSorted(baseline, quantile);
  if (!Number.isFinite(threshold)) return null;

  let baselineSlow = 0;
  for (let i = 0; i < sample1.length; i++) {
    if (sample1[i] > threshold) baselineSlow++;
  }

  let recentSlow = 0;
  for (let i = 0; i < sample2.length; i++) {
    if (sample2[i] > threshold) recentSlow++;
  }

  const baselineFraction = baselineSlow / sample1.length;
  const recentFraction = recentSlow / sample2.length;
  const relativeChange =
    baselineFraction > 0 ? (recentFraction - baselineFraction) / baselineFraction : null;

  return {
    thresholdSec: Number(threshold.toFixed(2)),
    baselineFraction,
    recentFraction,
    relativeChange: relativeChange === null ? null : Number(relativeChange.toFixed(4)),
  };
}

/**
 * Calculates global high-level summary statistics
 */
export function calculateGlobalStats(solves: Solve[]): GlobalStats {
  const validSolves = solves.filter((s) => s.penalty !== 'DNF');
  const dnfCount = solves.length - validSolves.length;

  let bestSingle: Solve | null = null;
  let worstSingle: Solve | null = null;

  if (validSolves.length > 0) {
    let best = validSolves[0];
    let worst = validSolves[0];
    for (let i = 1; i < validSolves.length; i++) {
      const s = validSolves[i];
      if (s.finalTimeSec < best.finalTimeSec) best = s;
      if (s.finalTimeSec > worst.finalTimeSec) worst = s;
    }
    bestSingle = best;
    worstSingle = worst;
  }

  // Find best Ao5, Ao12, Ao50 across session
  let bestAo5: number | null = null;
  let bestAo12: number | null = null;
  let bestAo50: number | null = null;

  for (let i = 0; i < solves.length; i++) {
    const ao5 = solves[i].ao5 ?? calculateAoN(solves, i, 5);
    const ao12 = solves[i].ao12;
    const ao50 = solves[i].ao50;

    if (ao5 !== null && (bestAo5 === null || ao5 < bestAo5)) bestAo5 = ao5;
    if (ao12 != null && (bestAo12 === null || ao12 < bestAo12)) bestAo12 = ao12;
    if (ao50 != null && (bestAo50 === null || ao50 < bestAo50)) bestAo50 = ao50;
  }

  // Current Ao5 and Ao12
  const currentAo5 =
    solves.length > 0
      ? (solves[solves.length - 1].ao5 ?? calculateAoN(solves, solves.length - 1, 5))
      : null;
  const currentAo12 = solves.length > 0 ? solves[solves.length - 1].ao12 || null : null;

  const times = validSolves.map((s) => s.finalTimeSec);
  const overallMean =
    times.length > 0 ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)) : 0;

  times.sort((a, b) => a - b);
  const overallMedian =
    times.length > 0 ? Number(times[Math.floor(times.length / 2)].toFixed(2)) : 0;

  const regression = calculateLinearRegression(solves);

  // Improvement comparison (First 15% vs Last 15%)
  const sampleSize = Math.max(5, Math.floor(validSolves.length * 0.15));
  const initialTimes = validSolves.slice(0, sampleSize).map((s) => s.finalTimeSec);
  const recentTimes = validSolves
    .slice(Math.max(0, validSolves.length - sampleSize))
    .map((s) => s.finalTimeSec);

  const initialAvg =
    initialTimes.length > 0 ? initialTimes.reduce((a, b) => a + b, 0) / initialTimes.length : 0;
  const recentAvg =
    recentTimes.length > 0 ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length : 0;

  const improvementSec = Number((initialAvg - recentAvg).toFixed(2));
  const improvementPct =
    initialAvg > 0 ? Number(((improvementSec / initialAvg) * 100).toFixed(1)) : 0;

  return {
    totalSolves: solves.length,
    dnfCount,
    bestSingle,
    worstSingle,
    bestAo5,
    bestAo12,
    bestAo50,
    currentAo5,
    currentAo12,
    overallMean,
    overallMedian,
    regression,
    initialAvg: Number(initialAvg.toFixed(2)),
    recentAvg: Number(recentAvg.toFixed(2)),
    improvementSec,
    improvementPct,
  };
}

/**
 * Calculates chronological PB (Personal Best) step-down progression over time for Singles, Ao5, Ao12, Ao50, and Ao100
 */
export function calculatePbProgression(solves: Solve[]): PbProgressionResult {
  let currentPbSingle: number | null = null;
  let currentPbAo5: number | null = null;
  let currentPbAo12: number | null = null;
  let currentPbAo50: number | null = null;
  let currentPbAo100: number | null = null;

  let activeDropSingle = 0;
  let activeDropAo5 = 0;
  let activeDropAo12 = 0;
  let activeDropAo50 = 0;
  let activeDropAo100 = 0;

  let initialPbSingle: number | null = null;

  let totalSinglePbs = 0;
  let totalAo5Pbs = 0;
  let totalAo12Pbs = 0;
  let totalAo50Pbs = 0;
  let totalAo100Pbs = 0;

  const milestones: PbMilestone[] = [];

  const dataPoints: PbDataPoint[] = solves.map((solve, idx) => {
    const single = solve.penalty === 'DNF' ? null : solve.finalTimeSec;
    const ao5 = solve.ao5 ?? calculateAoN(solves, idx, 5);
    const ao12 = solve.ao12 ?? calculateAoN(solves, idx, 12);
    const ao50 = solve.ao50 ?? calculateAoN(solves, idx, 50);
    const ao100 = solve.ao100 ?? calculateAoN(solves, idx, 100);

    let isNewPbSingle = false;
    let isNewPbAo5 = false;
    let isNewPbAo12 = false;
    let isNewPbAo50 = false;
    let isNewPbAo100 = false;

    // Check Single PB
    if (single !== null) {
      if (currentPbSingle === null) {
        currentPbSingle = single;
        initialPbSingle = single;
        activeDropSingle = 0;
        isNewPbSingle = true;
        totalSinglePbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Single',
          timeSec: single,
          dropSec: 0,
          scramble: solve.scramble,
        });
      } else if (single < currentPbSingle) {
        const drop = Number((currentPbSingle - single).toFixed(2));
        activeDropSingle = drop;
        currentPbSingle = single;
        isNewPbSingle = true;
        totalSinglePbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Single',
          timeSec: single,
          dropSec: drop,
          scramble: solve.scramble,
        });
      }
    }

    // Check Ao5 PB
    if (ao5 !== null) {
      if (currentPbAo5 === null) {
        currentPbAo5 = ao5;
        activeDropAo5 = 0;
        isNewPbAo5 = true;
        totalAo5Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao5',
          timeSec: ao5,
          dropSec: 0,
        });
      } else if (ao5 < currentPbAo5) {
        const drop = Number((currentPbAo5 - ao5).toFixed(2));
        activeDropAo5 = drop;
        currentPbAo5 = ao5;
        isNewPbAo5 = true;
        totalAo5Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao5',
          timeSec: ao5,
          dropSec: drop,
        });
      }
    }

    // Check Ao12 PB
    if (ao12 !== null) {
      if (currentPbAo12 === null) {
        currentPbAo12 = ao12;
        activeDropAo12 = 0;
        isNewPbAo12 = true;
        totalAo12Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao12',
          timeSec: ao12,
          dropSec: 0,
        });
      } else if (ao12 < currentPbAo12) {
        const drop = Number((currentPbAo12 - ao12).toFixed(2));
        activeDropAo12 = drop;
        currentPbAo12 = ao12;
        isNewPbAo12 = true;
        totalAo12Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao12',
          timeSec: ao12,
          dropSec: drop,
        });
      }
    }

    // Check Ao50 PB
    if (ao50 !== null) {
      if (currentPbAo50 === null) {
        currentPbAo50 = ao50;
        activeDropAo50 = 0;
        isNewPbAo50 = true;
        totalAo50Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao50',
          timeSec: ao50,
          dropSec: 0,
        });
      } else if (ao50 < currentPbAo50) {
        const drop = Number((currentPbAo50 - ao50).toFixed(2));
        activeDropAo50 = drop;
        currentPbAo50 = ao50;
        isNewPbAo50 = true;
        totalAo50Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao50',
          timeSec: ao50,
          dropSec: drop,
        });
      }
    }

    // Check Ao100 PB
    if (ao100 !== null) {
      if (currentPbAo100 === null) {
        currentPbAo100 = ao100;
        activeDropAo100 = 0;
        isNewPbAo100 = true;
        totalAo100Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao100',
          timeSec: ao100,
          dropSec: 0,
        });
      } else if (ao100 < currentPbAo100) {
        const drop = Number((currentPbAo100 - ao100).toFixed(2));
        activeDropAo100 = drop;
        currentPbAo100 = ao100;
        isNewPbAo100 = true;
        totalAo100Pbs++;
        milestones.push({
          index: solve.index,
          dateStr: solve.dateStr,
          type: 'Ao100',
          timeSec: ao100,
          dropSec: drop,
        });
      }
    }

    return {
      index: solve.index,
      dateStr: solve.dateStr,
      timestamp: solve.timestamp,
      single,
      scramble: solve.scramble,
      penalty: solve.penalty,

      pbSingle: currentPbSingle,
      pbAo5: currentPbAo5,
      pbAo12: currentPbAo12,
      pbAo50: currentPbAo50,
      pbAo100: currentPbAo100,

      isNewPbSingle,
      isNewPbAo5,
      isNewPbAo12,
      isNewPbAo50,
      isNewPbAo100,

      dropSingle: activeDropSingle,
      dropAo5: activeDropAo5,
      dropAo12: activeDropAo12,
      dropAo50: activeDropAo50,
      dropAo100: activeDropAo100,
    };
  });

  const singlePbImprovement =
    initialPbSingle !== null && currentPbSingle !== null
      ? Number((initialPbSingle - currentPbSingle).toFixed(2))
      : 0;

  return {
    dataPoints,
    summary: {
      currentPbSingle,
      currentPbAo5,
      currentPbAo12,
      currentPbAo50,
      currentPbAo100,
      totalSinglePbs,
      totalAo5Pbs,
      totalAo12Pbs,
      totalAo50Pbs,
      totalAo100Pbs,
      singlePbImprovement,
    },
    pbMilestones: milestones,
  };
}
