import {
  Solve,
  PeriodGroup,
  LinearRegression,
  KDEPoint,
  GlobalStats,
  GroupingPeriod,
  PbDataPoint,
  PbMilestone,
  PbProgressionResult,
} from '../types';

/**
 * Calculates official WCA Average of N (Ao5, Ao12, Ao50) ending at solve index
 */
export function calculateAoN(solves: Solve[], currentIndex: number, n: number): number | null {
  if (currentIndex < n - 1) return null;

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
  
  if (trimmed.length === 0 || trimmed.some(t => !isFinite(t))) {
    return null;
  }

  const sum = trimmed.reduce((acc, val) => acc + val, 0);
  return Number((sum / trimmed.length).toFixed(2));
}

/**
 * Fits Ordinary Least Squares (OLS) Linear Regression: y = slope * x + intercept
 */
export function calculateLinearRegression(solves: Solve[]): LinearRegression {
  const validSolves = solves.filter(s => s.penalty !== 'DNF');
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
export function computeGroupStats(groupSolves: Solve[], label: string, startDate: Date, endDate: Date): PeriodGroup {
  const validTimes = groupSolves
    .filter(s => s.penalty !== 'DNF')
    .map(s => s.finalTimeSec)
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

  const insideTimes = validTimes.filter(t => t >= lowLimit && t <= highLimit);
  const whiskerLow = insideTimes.length > 0 ? insideTimes[0] : q1;
  const whiskerHigh = insideTimes.length > 0 ? insideTimes[insideTimes.length - 1] : q3;

  const outliers = validTimes.filter(t => t < lowLimit || t > highLimit);

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
    outliers: outliers.map(o => Number(o.toFixed(2))),
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
    case 'daily':
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
  customBatchSize: number = 50
): PeriodGroup[] {
  if (solves.length === 0) return [];

  if (period === 'batch50' || period === 'customBatch') {
    const groups: PeriodGroup[] = [];
    const batchSize = period === 'batch50' ? 50 : Math.max(1, customBatchSize);
    const totalBatches = Math.ceil(solves.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const slice = solves.slice(i * batchSize, (i + 1) * batchSize);
      const label = `Batch ${i + 1} (${i * batchSize + 1}-${Math.min((i + 1) * batchSize, solves.length)})`;
      const startDate = slice[0].date;
      const endDate = slice[slice.length - 1].date;

      groups.push(computeGroupStats(slice, label, startDate, endDate));
    }
    return groups;
  }

  // Time-based grouping
  const mapKeyToSolves = new Map<string, Solve[]>();
  const mapKeyToDates = new Map<string, { start: Date; end: Date; label: string }>();

  solves.forEach(s => {
    let key = '';
    let label = '';
    const d = new Date(s.timestamp);

    if (period === 'daily') {
      key = s.dateStr;
      label = s.dateStr;
    } else if (period === 'weekly') {
      // ISO week
      const tempDate = new Date(d.valueOf());
      const dayNum = (d.getDay() + 6) % 7;
      tempDate.setDate(tempDate.getDate() - dayNum + 3);
      const firstThursday = tempDate.valueOf();
      tempDate.setMonth(0, 1);
      if (tempDate.getDay() !== 4) {
        tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
      key = `${d.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
      label = `Week ${weekNum} (${d.getFullYear()})`;
    } else if (period === 'monthly') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    if (!mapKeyToSolves.has(key)) {
      mapKeyToSolves.set(key, []);
      mapKeyToDates.set(key, { start: d, end: d, label });
    }

    mapKeyToSolves.get(key)!.push(s);
    const dateRange = mapKeyToDates.get(key)!;
    if (d < dateRange.start) dateRange.start = d;
    if (d > dateRange.end) dateRange.end = d;
  });

  // Convert to array sorted chronologically
  const sortedKeys = Array.from(mapKeyToSolves.keys()).sort();

  // Generate friendly period group display labels
  const result: PeriodGroup[] = [];
  sortedKeys.forEach((key, index) => {
    const groupSolves = mapKeyToSolves.get(key)!;
    const info = mapKeyToDates.get(key)!;

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
export function calculateKDE(
  solves: Solve[],
  baselinePercent = 0.3,
  recentPercent = 0.3,
  numPoints = 100
): KDEPoint[] {
  const validSolves = solves.filter(s => s.penalty !== 'DNF');
  if (validSolves.length < 5) return [];

  const splitBaselineIndex = Math.max(3, Math.floor(validSolves.length * baselinePercent));
  const splitRecentIndex = Math.min(validSolves.length - 3, Math.floor(validSolves.length * (1 - recentPercent)));

  const baselineTimes = validSolves.slice(0, splitBaselineIndex).map(s => s.finalTimeSec);
  const recentTimes = validSolves.slice(splitRecentIndex).map(s => s.finalTimeSec);

  if (baselineTimes.length === 0 || recentTimes.length === 0) return [];

  // Determine global min and max X values with bandwidth margin
  const allTimes = [...baselineTimes, ...recentTimes];
  const minTime = Math.max(0, Math.min(...allTimes) - 3);
  const maxTime = Math.max(...allTimes) + 5;

  // Silverman's Rule of Thumb for Gaussian kernel bandwidth calculation
  const getBandwidth = (times: number[]) => {
    if (times.length < 2) return 1.5;
    const n = times.length;
    const mean = times.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(times.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    return Math.max(0.8, 1.06 * (std || 1) * Math.pow(n, -0.2));
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
 * Calculates global high-level summary statistics
 */
export function calculateGlobalStats(solves: Solve[]): GlobalStats {
  const validSolves = solves.filter(s => s.penalty !== 'DNF');
  const dnfCount = solves.length - validSolves.length;

  let bestSingle: Solve | null = null;
  let worstSingle: Solve | null = null;

  if (validSolves.length > 0) {
    const sorted = [...validSolves].sort((a, b) => a.finalTimeSec - b.finalTimeSec);
    bestSingle = sorted[0];
    worstSingle = sorted[sorted.length - 1];
  }

  // Find best Ao5, Ao12, Ao50 across session
  let bestAo5: number | null = null;
  let bestAo12: number | null = null;
  let bestAo50: number | null = null;

  for (let i = 0; i < solves.length; i++) {
    const ao5 = calculateAoN(solves, i, 5);
    const ao12 = solves[i].ao12;
    const ao50 = solves[i].ao50;

    if (ao5 !== null && (bestAo5 === null || ao5 < bestAo5)) bestAo5 = ao5;
    if (ao12 !== null && (bestAo12 === null || ao12 < bestAo12)) bestAo12 = ao12;
    if (ao50 !== null && (bestAo50 === null || ao50 < bestAo50)) bestAo50 = ao50;
  }

  // Current Ao5 and Ao12
  const currentAo5 = calculateAoN(solves, solves.length - 1, 5);
  const currentAo12 = solves.length > 0 ? solves[solves.length - 1].ao12 || null : null;

  const times = validSolves.map(s => s.finalTimeSec);
  const overallMean = times.length > 0 ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)) : 0;

  times.sort((a, b) => a - b);
  const overallMedian = times.length > 0 ? Number((times[Math.floor(times.length / 2)]).toFixed(2)) : 0;

  const regression = calculateLinearRegression(solves);

  // Improvement comparison (First 15% vs Last 15%)
  const sampleSize = Math.max(5, Math.floor(validSolves.length * 0.15));
  const initialTimes = validSolves.slice(0, sampleSize).map(s => s.finalTimeSec);
  const recentTimes = validSolves.slice(validSolves.length - sampleSize).map(s => s.finalTimeSec);

  const initialAvg = initialTimes.length > 0 ? initialTimes.reduce((a, b) => a + b, 0) / initialTimes.length : 0;
  const recentAvg = recentTimes.length > 0 ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length : 0;

  const improvementSec = Number((initialAvg - recentAvg).toFixed(2));
  const improvementPct = initialAvg > 0 ? Number(((improvementSec / initialAvg) * 100).toFixed(1)) : 0;

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
    const ao5 = calculateAoN(solves, idx, 5);
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

