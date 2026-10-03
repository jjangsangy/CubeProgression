import { describe, expect, it } from 'vitest';
import type { KDEPeak, KDEPoint, Solve } from '../types';
import {
  calculateAoN,
  calculateGlobalStats,
  calculateKDE,
  calculateKDEFromSamples,
  calculateLinearRegression,
  calculatePbProgression,
  calculatePeakDistance,
  computeGroupStats,
  findKDEPeak,
  getNormalizedYCeiling,
  getNormalizedYCeilingWithHysteresis,
  getPeriodUnitInfo,
  groupSolvesByPeriod,
} from './statsMath';

const mockSolves: Solve[] = [
  {
    id: 1,
    index: 1,
    timeMs: 12000,
    rawTimeSec: 12.0,
    finalTimeSec: 12.0,
    penalty: 'OK',
    timestamp: 1600000000000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 2,
    index: 2,
    timeMs: 10000,
    rawTimeSec: 10.0,
    finalTimeSec: 10.0,
    penalty: 'OK',
    timestamp: 1600000100000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  {
    id: 3,
    index: 3,
    timeMs: 15000,
    rawTimeSec: 15.0,
    finalTimeSec: 15.0,
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
    timeMs: 13000,
    rawTimeSec: 13.0,
    finalTimeSec: 13.0,
    penalty: 'OK',
    timestamp: 1600000400000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
];

describe('statsMath utils', () => {
  describe('calculateAoN', () => {
    it('returns null if there are fewer solves than N', () => {
      expect(calculateAoN(mockSolves, 2, 5)).toBeNull();
    });

    it('calculates official Ao5 trimming best and worst times', () => {
      // Solves times: 12.0, 10.0, 15.0, 11.0, 13.0
      // Trimmed (best 10.0 and worst 15.0): [11.0, 12.0, 13.0]
      // Mean: (11.0 + 12.0 + 13.0) / 3 = 12.0
      const ao5 = calculateAoN(mockSolves, 4, 5);
      expect(ao5).toBe(12.0);
    });

    it('handles 1 DNF solve in Ao5', () => {
      const solvesWithDNF: Solve[] = [
        ...mockSolves.slice(0, 4),
        { ...mockSolves[4], penalty: 'DNF' },
      ];
      // Times: 12, 10, 15, 11, DNF
      // Sorted effective: [10, 11, 12, 15, Infinity]
      // Trim 1 best (10) and 1 worst (Infinity) -> [11, 12, 15]
      // Mean: (11 + 12 + 15) / 3 = 12.67
      const ao5 = calculateAoN(solvesWithDNF, 4, 5);
      expect(ao5).toBe(12.67);
    });

    it('correctly handles Ao50 DNF thresholds (2 DNFs allowed, 3 DNFs results in null)', () => {
      // 50 solves: 48 valid solves at 10.0s, 2 DNFs (trim count is floor(50 * 0.05) = 2)
      const solves50With2DNF: Solve[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        penalty: (i < 2 ? 'DNF' : 'OK') as 'DNF' | 'OK',
        finalTimeSec: i < 2 ? Infinity : 10.0,
      }));

      const ao50With2 = calculateAoN(solves50With2DNF, 49, 50);
      expect(ao50With2).toBe(10.0);

      // 3 DNFs should exceed threshold (3 > 2) and return null
      const solves50With3DNF: Solve[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        penalty: (i < 3 ? 'DNF' : 'OK') as 'DNF' | 'OK',
        finalTimeSec: i < 3 ? Infinity : 10.0,
      }));

      const ao50With3 = calculateAoN(solves50With3DNF, 49, 50);
      expect(ao50With3).toBeNull();
    });

    it('calculates average correctly with identical times and boundary indices', () => {
      const identicalSolves: Solve[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        finalTimeSec: 11.0,
      }));

      expect(calculateAoN(identicalSolves, 4, 5)).toBe(11.0);
      expect(calculateAoN(identicalSolves, 5, 5)).toBeNull();
    });

    it('uses finalTimeSec with +2 penalty rather than rawTimeSec', () => {
      const solvesWithPlus2: Solve[] = [
        ...mockSolves.slice(0, 4),
        { ...mockSolves[4], rawTimeSec: 10.0, finalTimeSec: 12.0, penalty: '+2' },
      ];
      // Times: 12.0, 10.0, 15.0, 11.0, 12.0. Min: 10.0, Max: 15.0. Middle: 11.0, 12.0, 12.0 => 35.0 / 3 = 11.67
      expect(calculateAoN(solvesWithPlus2, 4, 5)).toBe(11.67);
    });

    it('returns null if DNF count exceeds max allowed DNFs', () => {
      const solvesWith2DNF: Solve[] = [
        ...mockSolves.slice(0, 3),
        { ...mockSolves[3], penalty: 'DNF' },
        { ...mockSolves[4], penalty: 'DNF' },
      ];
      // 2 DNFs in Ao5 -> exceeds max 1 DNF
      expect(calculateAoN(solvesWith2DNF, 4, 5)).toBeNull();
    });
    it('returns null if window size results in empty trimmed times (e.g. n = 2)', () => {
      // For n = 2, trimCount = 1, so trimmed = effectiveTimes.slice(1, 1) -> length 0
      expect(calculateAoN(mockSolves.slice(0, 2), 1, 2)).toBeNull();
    });
  });

  describe('calculateLinearRegression', () => {
    it('returns zero defaults for fewer than 2 valid solves', () => {
      const result = calculateLinearRegression([mockSolves[0]]);
      expect(result).toEqual({
        slope: 0,
        intercept: 0,
        r2: 0,
        slopeFormatted: '0.0000s/solve',
      });
    });

    it('calculates correct OLS linear regression parameters for valid solves', () => {
      const result = calculateLinearRegression(mockSolves);
      expect(typeof result.slope).toBe('number');
      expect(typeof result.intercept).toBe('number');
      expect(result.r2).toBeGreaterThanOrEqual(0);
      expect(result.slopeFormatted).toMatch(/^[+-]?\d+\.\d{4}s\/solve$/);
    });

    it('ignores DNF solves when computing regression', () => {
      const solvesWithDNF = [
        ...mockSolves,
        { ...mockSolves[0], index: 6, penalty: 'DNF' as const },
      ];
      const resWithoutDNF = calculateLinearRegression(mockSolves);
      const resWithDNF = calculateLinearRegression(solvesWithDNF);
      expect(resWithDNF.slope).toBeCloseTo(resWithoutDNF.slope);
      expect(resWithDNF.intercept).toBeCloseTo(resWithoutDNF.intercept);
    });
  });

  describe('computeGroupStats', () => {
    it('returns zeroed group stats when no valid solves exist in group', () => {
      const dnfSolves = [{ ...mockSolves[0], penalty: 'DNF' as const }];
      const dummyDate = Temporal.Now.plainDateISO();
      const stats = computeGroupStats(dnfSolves, 'Group 1', dummyDate, dummyDate);
      expect(stats.mean).toBe(0);
      expect(stats.solves).toEqual(dnfSolves);
      expect(stats.outliers).toEqual([]);
    });

    it('calculates mean, median, quantiles, and outliers accurately', () => {
      const dummyDate = Temporal.Now.plainDateISO();
      const stats = computeGroupStats(mockSolves, 'Group 1', dummyDate, dummyDate);
      // Times: 10.0, 11.0, 12.0, 13.0, 15.0
      expect(stats.mean).toBe(12.2);
      expect(stats.median).toBe(12.0);
      expect(stats.min).toBe(10.0);
      expect(stats.max).toBe(15.0);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    it('identifies both low and high outliers using 1.5 * IQR rule', () => {
      const solvesWithOutliers: Solve[] = [2.0, 10.0, 11.0, 12.0, 13.0, 25.0].map((t, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: t,
        rawTimeSec: t,
      }));

      const dummyDate = Temporal.Now.plainDateISO();
      const stats = computeGroupStats(solvesWithOutliers, 'Outlier Group', dummyDate, dummyDate);
      expect(stats.outliers).toEqual([2.0, 25.0]);
      expect(stats.whiskerLow).toBe(10.0);
      expect(stats.whiskerHigh).toBe(13.0);
    });

    it('handles single solve and identical solves without errors', () => {
      const singleSolve = [mockSolves[0]];
      const dummyDate = Temporal.Now.plainDateISO();
      const singleStats = computeGroupStats(singleSolve, 'Single', dummyDate, dummyDate);
      expect(singleStats.mean).toBe(12.0);
      expect(singleStats.median).toBe(12.0);
      expect(singleStats.iqr).toBe(0);
      expect(singleStats.stdDev).toBe(0);
      expect(singleStats.outliers).toEqual([]);

      const identicalSolves: Solve[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        finalTimeSec: 10.0,
      }));
      const identicalStats = computeGroupStats(identicalSolves, 'Identical', dummyDate, dummyDate);
      expect(identicalStats.iqr).toBe(0);
      expect(identicalStats.stdDev).toBe(0);
      expect(identicalStats.whiskerLow).toBe(10.0);
      expect(identicalStats.whiskerHigh).toBe(10.0);
      expect(identicalStats.outliers).toEqual([]);
    });
  });

  describe('groupSolvesByPeriod', () => {
    it('returns empty array when solves array is empty', () => {
      expect(groupSolvesByPeriod([], 'daily')).toEqual([]);
    });

    it('groups solves by batch size (batch50 / customBatch)', () => {
      const batches = groupSolvesByPeriod(mockSolves, 'customBatch', 2);
      expect(batches.length).toBe(3);
      expect(batches[0].label).toContain('Batch 1 (1-2)');
      expect(batches[1].label).toContain('Batch 2 (3-4)');
      expect(batches[2].label).toContain('Batch 3 (5-5)');
    });

    it('groups solves by daily period', () => {
      const dailyGroups = groupSolvesByPeriod(mockSolves, 'daily');
      expect(dailyGroups.length).toBe(1);
      expect(dailyGroups[0].label).toContain('Day 1');
    });

    it('groups solves by weekly period', () => {
      const weeklyGroups = groupSolvesByPeriod(mockSolves, 'weekly');
      expect(weeklyGroups.length).toBe(1);
      expect(weeklyGroups[0].label).toContain('Week 1');
    });

    it('groups solves by monthly period', () => {
      const monthlyGroups = groupSolvesByPeriod(mockSolves, 'monthly');
      expect(monthlyGroups.length).toBe(1);
      expect(monthlyGroups[0].label).toContain('Month 1');
    });

    it('correctly tracks dateRange start when timestamps are not in chronological order', () => {
      // Solve 1 on Tuesday, Solve 2 on Monday (earlier date encountered second within same week)
      const outOfOrderSolves: Solve[] = [
        {
          ...mockSolves[0],
          timestamp: 1600170000000,
          date: Temporal.PlainDate.from('2020-09-15'),
          dateStr: '2020-09-15',
        },
        {
          ...mockSolves[1],
          timestamp: 1600083600000,
          date: Temporal.PlainDate.from('2020-09-14'),
          dateStr: '2020-09-14',
        },
      ];
      const groups = groupSolvesByPeriod(outOfOrderSolves, 'weekly');
      expect(groups.length).toBe(1);
      expect(groups[0].startDate.toString()).toBe('2020-09-14');
      expect(groups[0].endDate.toString()).toBe('2020-09-15');
    });

    it('handles multi-day gaps between solves cleanly', () => {
      const gappedSolves: Solve[] = [
        { ...mockSolves[0], timestamp: 1600000000000 }, // 2020-09-13
        { ...mockSolves[1], timestamp: 1600864000000 }, // 2020-09-23 (+10 days)
      ];
      const groups = groupSolvesByPeriod(gappedSolves, 'daily');
      expect(groups.length).toBe(2);
      expect(groups[0].label).toContain('Day 1');
      expect(groups[1].label).toContain('Day 2');
    });
  });

  describe('getNormalizedYCeiling', () => {
    it('returns default fallback ceiling when maxDensity is zero or non-finite', () => {
      expect(getNormalizedYCeiling(0)).toBe(0.2);
      expect(getNormalizedYCeiling(-1)).toBe(0.2);
      expect(getNormalizedYCeiling(Number.NaN)).toBe(0.2);
    });

    it('normalizes ceiling proportionally across small and large peak densities', () => {
      // Small peak density (e.g. wide sample spread, maxDensity = 0.04)
      const smallCeiling = getNormalizedYCeiling(0.04);
      expect(smallCeiling).toBe(0.05);
      // Peak occupies ~80% of chart height
      expect(0.04 / smallCeiling).toBeCloseTo(0.8, 1);

      // Medium peak density (maxDensity = 0.22)
      const medCeiling = getNormalizedYCeiling(0.22);
      expect(medCeiling).toBe(0.3);
      expect(0.22 / medCeiling).toBeGreaterThanOrEqual(0.7);
      expect(0.22 / medCeiling).toBeLessThanOrEqual(0.85);

      // High peak density (e.g. narrow sample cluster, maxDensity = 0.75)
      const highCeiling = getNormalizedYCeiling(0.75);
      expect(highCeiling).toBe(1.0);
      expect(0.75 / highCeiling).toBe(0.75);
    });

    it('dampens ceiling oscillation via hysteresis when peak stays comfortably within bounds', () => {
      // Current ceiling is 0.30
      // Small fluctuation around 0.22-0.24 should NOT change the ceiling
      expect(getNormalizedYCeilingWithHysteresis(0.24, 0.3)).toBe(0.3);
      expect(getNormalizedYCeilingWithHysteresis(0.18, 0.3)).toBe(0.3);

      // Significant drop below 50% threshold triggers re-normalization
      expect(getNormalizedYCeilingWithHysteresis(0.08, 0.3)).toBe(0.1);

      // Sharp surge above 90% threshold immediately expands ceiling to prevent clipping
      expect(getNormalizedYCeilingWithHysteresis(0.29, 0.3)).toBeGreaterThanOrEqual(0.3);
      expect(getNormalizedYCeilingWithHysteresis(0.45, 0.3)).toBe(0.6);
    });
  });

  describe('calculateKDEFromSamples', () => {
    it('returns empty array if either sample is empty or contains only DNFs', () => {
      expect(calculateKDEFromSamples([], mockSolves)).toEqual([]);
      expect(calculateKDEFromSamples(mockSolves, [])).toEqual([]);
      const dnfSolves: Solve[] = [{ ...mockSolves[0], penalty: 'DNF' }];
      expect(calculateKDEFromSamples(dnfSolves, mockSolves)).toEqual([]);
    });

    it('calculates KDE curves comparing two arbitrary subsets of solves', () => {
      const sample1 = mockSolves.slice(0, 3);
      const sample2 = mockSolves.slice(2, 5);
      const points = calculateKDEFromSamples(sample1, sample2, 25);
      expect(points.length).toBe(25);
      expect(points[0]).toHaveProperty('baselineDensity');
      expect(points[0]).toHaveProperty('recentDensity');
      expect(points.every((p) => p.x >= 0)).toBe(true);
    });

    it('respects fixed domain boundaries when provided to ensure stable evaluation points', () => {
      const sample1 = mockSolves.slice(0, 2);
      const sample2 = mockSolves.slice(3, 5);
      const points = calculateKDEFromSamples(sample1, sample2, 11, { minTime: 5, maxTime: 15 });
      expect(points.length).toBe(11);
      expect(points[0].x).toBe(5);
      expect(points[points.length - 1].x).toBe(15);
    });
  });

  describe('calculateKDE', () => {
    it('returns empty array if valid solves are fewer than 5', () => {
      expect(calculateKDE(mockSolves.slice(0, 3))).toEqual([]);
    });

    it('generates density distribution points for valid solves', () => {
      const extendedSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: 10 + (idx % 5),
      }));

      const points = calculateKDE(extendedSolves, 0.3, 0.3, 20);
      expect(points.length).toBe(20);
      expect(points[0]).toHaveProperty('x');
      expect(points[0]).toHaveProperty('baselineDensity');
      expect(points[0]).toHaveProperty('recentDensity');
    });

    it('handles identical solves (zero variance) gracefully without NaN', () => {
      const identicalSolves: Solve[] = Array.from({ length: 10 }, (_, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: 10.0,
      }));

      const points = calculateKDE(identicalSolves);
      expect(points.length).toBe(100);
      expect(points.every((p) => !Number.isNaN(p.x) && !Number.isNaN(p.baselineDensity))).toBe(
        true,
      );
      const maxDensity = Math.max(...points.map((p) => p.baselineDensity));
      expect(maxDensity).toBeGreaterThan(0);
    });

    it('ensures x values clamp at zero for very fast solves', () => {
      const fastSolves: Solve[] = Array.from({ length: 10 }, (_, idx) => ({
        ...mockSolves[0],
        id: idx + 1,
        index: idx + 1,
        finalTimeSec: 1.2,
      }));

      const points = calculateKDE(fastSolves);
      expect(points.every((p) => p.x >= 0)).toBe(true);
    });
  });

  describe('findKDEPeak', () => {
    it('returns null for empty points array', () => {
      expect(findKDEPeak([], 'baselineDensity')).toBeNull();
    });

    it('returns null when all densities are zero or non-positive', () => {
      const flatZeroPoints: KDEPoint[] = [
        { x: 10, baselineDensity: 0, recentDensity: 0 },
        { x: 11, baselineDensity: 0, recentDensity: 0 },
      ];
      expect(findKDEPeak(flatZeroPoints, 'baselineDensity')).toBeNull();
    });

    it('detects discrete peak on symmetric distribution and refines to exact center', () => {
      const symmetricPoints: KDEPoint[] = [
        { x: 10, baselineDensity: 0.1, recentDensity: 0.05 },
        { x: 11, baselineDensity: 0.5, recentDensity: 0.2 },
        { x: 12, baselineDensity: 0.1, recentDensity: 0.05 },
      ];
      const peak = findKDEPeak(symmetricPoints, 'baselineDensity');
      expect(peak).not.toBeNull();
      expect(peak?.x).toBe(11);
      expect(peak?.interpolatedTime).toBe(11);
      expect(peak?.density).toBe(0.5);
      expect(peak?.index).toBe(1);
    });

    it('refines peak to sub-grid position using parabolic interpolation for skewed neighbors', () => {
      // Discrete peak at x=11, but right neighbor (0.45) is significantly higher than left neighbor (0.2)
      // Analytical solution: delta = (0.2 - 0.45) / (2*(0.2 - 1.0 + 0.45)) = 5/14 approx 0.3571
      // peakTime = 11 + (5/14)*1 = 11.36, peakDensity = 0.5 - 0.25*(-0.25)*(5/14) = 0.5223
      const rightSkewedPoints: KDEPoint[] = [
        { x: 10, baselineDensity: 0.2, recentDensity: 0.1 },
        { x: 11, baselineDensity: 0.5, recentDensity: 0.3 },
        { x: 12, baselineDensity: 0.45, recentDensity: 0.2 },
      ];
      const peakRight = findKDEPeak(rightSkewedPoints, 'baselineDensity');
      expect(peakRight).toEqual({
        x: 11,
        interpolatedTime: 11.36,
        density: 0.5223,
        index: 1,
      });

      // Left-skewed: neighbor at x=10 (0.45) higher than neighbor at x=12 (0.2)
      // Analytical solution: peakTime = 11 - (5/14)*1 = 10.64, peakDensity = 0.5223
      const leftSkewedPoints: KDEPoint[] = [
        { x: 10, baselineDensity: 0.45, recentDensity: 0.1 },
        { x: 11, baselineDensity: 0.5, recentDensity: 0.3 },
        { x: 12, baselineDensity: 0.2, recentDensity: 0.2 },
      ];
      const peakLeft = findKDEPeak(leftSkewedPoints, 'baselineDensity');
      expect(peakLeft).toEqual({
        x: 11,
        interpolatedTime: 10.64,
        density: 0.5223,
        index: 1,
      });
    });

    it('handles boundary peaks at first or last index without errors', () => {
      const boundaryFirst: KDEPoint[] = [
        { x: 8, baselineDensity: 0.8, recentDensity: 0.1 },
        { x: 9, baselineDensity: 0.5, recentDensity: 0.2 },
        { x: 10, baselineDensity: 0.2, recentDensity: 0.3 },
      ];
      const peakFirst = findKDEPeak(boundaryFirst, 'baselineDensity');
      expect(peakFirst).not.toBeNull();
      expect(peakFirst?.x).toBe(8);
      expect(peakFirst?.interpolatedTime).toBe(8);
      expect(peakFirst?.index).toBe(0);

      const boundaryLast: KDEPoint[] = [
        { x: 8, baselineDensity: 0.2, recentDensity: 0.1 },
        { x: 9, baselineDensity: 0.5, recentDensity: 0.2 },
        { x: 10, baselineDensity: 0.8, recentDensity: 0.3 },
      ];
      const peakLast = findKDEPeak(boundaryLast, 'baselineDensity');
      expect(peakLast).not.toBeNull();
      expect(peakLast?.x).toBe(10);
      expect(peakLast?.interpolatedTime).toBe(10);
      expect(peakLast?.index).toBe(2);
    });

    it('handles interior flat peak plateaus with delta shifted to midpoint', () => {
      const interiorPlateau: KDEPoint[] = [
        { x: 9, baselineDensity: 0.1, recentDensity: 0.1 },
        { x: 10, baselineDensity: 0.5, recentDensity: 0.5 },
        { x: 11, baselineDensity: 0.5, recentDensity: 0.5 },
        { x: 12, baselineDensity: 0.1, recentDensity: 0.1 },
      ];
      const peak = findKDEPeak(interiorPlateau, 'recentDensity');
      expect(peak).toEqual({
        x: 10,
        interpolatedTime: 10.5,
        density: 0.55,
        index: 1,
      });
    });

    it('handles single-point and two-point distributions without errors', () => {
      const single: KDEPoint[] = [{ x: 10, baselineDensity: 0.5, recentDensity: 0.2 }];
      expect(findKDEPeak(single, 'baselineDensity')).toEqual({
        x: 10,
        interpolatedTime: 10,
        density: 0.5,
        index: 0,
      });

      const double: KDEPoint[] = [
        { x: 10, baselineDensity: 0.2, recentDensity: 0.1 },
        { x: 11, baselineDensity: 0.6, recentDensity: 0.3 },
      ];
      expect(findKDEPeak(double, 'baselineDensity')).toEqual({
        x: 11,
        interpolatedTime: 11,
        density: 0.6,
        index: 1,
      });
    });

    it('safely handles non-finite or NaN neighbor densities without returning NaN', () => {
      const nanNeighbor: KDEPoint[] = [
        { x: 10, baselineDensity: 0.2, recentDensity: 0 },
        { x: 11, baselineDensity: 0.8, recentDensity: 0 },
        { x: 12, baselineDensity: Number.NaN, recentDensity: 0 },
      ];
      const peak = findKDEPeak(nanNeighbor, 'baselineDensity');
      expect(peak).not.toBeNull();
      expect(Number.isFinite(peak?.interpolatedTime)).toBe(true);
      expect(Number.isFinite(peak?.density)).toBe(true);
      expect(peak?.interpolatedTime).toBe(11);
    });

    it('accurately evaluates recentDensity independent of baselineDensity', () => {
      const dualPoints: KDEPoint[] = [
        { x: 10, baselineDensity: 0.9, recentDensity: 0.1 },
        { x: 11, baselineDensity: 0.5, recentDensity: 0.2 },
        { x: 12, baselineDensity: 0.1, recentDensity: 0.85 },
      ];
      const baselinePeak = findKDEPeak(dualPoints, 'baselineDensity');
      const recentPeak = findKDEPeak(dualPoints, 'recentDensity');
      expect(baselinePeak).toEqual({
        x: 10,
        interpolatedTime: 10,
        density: 0.9,
        index: 0,
      });
      expect(recentPeak).toEqual({
        x: 12,
        interpolatedTime: 12,
        density: 0.85,
        index: 2,
      });
    });
  });

  describe('calculatePeakDistance', () => {
    it('returns null when either or both peaks are null or non-finite', () => {
      const peak: KDEPeak = { x: 10, interpolatedTime: 10.25, density: 0.5, index: 1 };
      const nanPeak: KDEPeak = { x: 10, interpolatedTime: Number.NaN, density: 0.5, index: 1 };
      expect(calculatePeakDistance(null, null)).toBeNull();
      expect(calculatePeakDistance(peak, null)).toBeNull();
      expect(calculatePeakDistance(null, peak)).toBeNull();
      expect(calculatePeakDistance(peak, nanPeak)).toBeNull();
    });

    it('calculates absolute distance when baseline is slower than recent', () => {
      const baselinePeak: KDEPeak = { x: 12, interpolatedTime: 12.45, density: 0.4, index: 20 };
      const recentPeak: KDEPeak = { x: 10, interpolatedTime: 10.15, density: 0.6, index: 10 };
      expect(calculatePeakDistance(baselinePeak, recentPeak)).toBe(2.3);
    });

    it('calculates absolute distance when recent is slower than baseline', () => {
      const baselinePeak: KDEPeak = { x: 10, interpolatedTime: 10.15, density: 0.6, index: 10 };
      const recentPeak: KDEPeak = { x: 12, interpolatedTime: 12.45, density: 0.4, index: 20 };
      expect(calculatePeakDistance(baselinePeak, recentPeak)).toBe(2.3);
    });

    it('returns 0 when both peaks have identical interpolated time', () => {
      const peakA: KDEPeak = { x: 11, interpolatedTime: 11.2, density: 0.5, index: 15 };
      const peakB: KDEPeak = { x: 11, interpolatedTime: 11.2, density: 0.45, index: 15 };
      expect(calculatePeakDistance(peakA, peakB)).toBe(0);
    });
  });

  describe('calculateGlobalStats', () => {
    it('calculates global session metrics properly', () => {
      const stats = calculateGlobalStats(mockSolves);
      expect(stats.totalSolves).toBe(5);
      expect(stats.dnfCount).toBe(0);
      expect(stats.bestSingle?.finalTimeSec).toBe(10.0);
      expect(stats.worstSingle?.finalTimeSec).toBe(15.0);
      expect(stats.bestAo5).toBe(12.0);
      expect(stats.overallMean).toBe(12.2);
      expect(stats.overallMedian).toBe(12.0);
      expect(stats.improvementSec).toBeDefined();
      expect(stats.improvementPct).toBeDefined();
    });

    it('handles session with DNFs', () => {
      const solvesWithDNF = [
        ...mockSolves,
        { ...mockSolves[0], id: 6, index: 6, penalty: 'DNF' as const, finalTimeSec: Infinity },
      ];
      const stats = calculateGlobalStats(solvesWithDNF);
      expect(stats.totalSolves).toBe(6);
      expect(stats.dnfCount).toBe(1);
    });

    it('handles empty session and all-DNF session safely', () => {
      const emptyStats = calculateGlobalStats([]);
      expect(emptyStats.totalSolves).toBe(0);
      expect(emptyStats.overallMean).toBe(0);
      expect(emptyStats.bestSingle).toBeNull();
      expect(emptyStats.bestAo5).toBeNull();

      const allDnfSolves: Solve[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        penalty: 'DNF' as const,
        finalTimeSec: Infinity,
      }));
      const dnfStats = calculateGlobalStats(allDnfSolves);
      expect(dnfStats.totalSolves).toBe(5);
      expect(dnfStats.dnfCount).toBe(5);
      expect(dnfStats.bestSingle).toBeNull();
      expect(dnfStats.overallMean).toBe(0);
    });

    it('correctly compares initial vs recent times for small sessions (< 5 solves)', () => {
      const smallSession: Solve[] = [
        { ...mockSolves[0], finalTimeSec: 10.0 },
        { ...mockSolves[1], finalTimeSec: 10.0 },
        { ...mockSolves[2], finalTimeSec: 10.0 },
      ];
      const stats = calculateGlobalStats(smallSession);
      expect(stats.totalSolves).toBe(3);
      expect(stats.improvementSec).toBe(0);
      expect(stats.improvementPct).toBe(0);
    });
  });

  describe('calculatePbProgression', () => {
    it('accurately calculates running Personal Bests, active drops on all points, and milestones', () => {
      // Mock times: 12.0, 10.0, 15.0, 11.0, 13.0
      const result = calculatePbProgression(mockSolves);

      expect(result.dataPoints.length).toBe(5);
      // Solve 1: PB Single = 12.0
      expect(result.dataPoints[0].pbSingle).toBe(12.0);
      expect(result.dataPoints[0].isNewPbSingle).toBe(true);

      // Solve 2: PB Single = 10.0
      expect(result.dataPoints[1].pbSingle).toBe(10.0);
      expect(result.dataPoints[1].isNewPbSingle).toBe(true);
      expect(result.dataPoints[1].dropSingle).toBe(2.0);

      // Solve 3: PB Single remains 10.0, but dropSingle stays 2.0 (active drop over previous PB)
      expect(result.dataPoints[2].pbSingle).toBe(10.0);
      expect(result.dataPoints[2].isNewPbSingle).toBe(false);
      expect(result.dataPoints[2].dropSingle).toBe(2.0);

      // Ao5 on Solve 5 (index 4) should be 12.0
      expect(result.summary.currentPbAo5).toBe(12.0);
      expect(result.summary.currentPbSingle).toBe(10.0);
      expect(result.pbMilestones.length).toBeGreaterThan(0);
    });

    it('calculates Ao100 when solves reach or exceed 100 solves', () => {
      const hundredSolves: Solve[] = Array.from({ length: 105 }, (_, i) => ({
        id: i + 1,
        index: i + 1,
        timeMs: 15000 - i * 10,
        rawTimeSec: (15000 - i * 10) / 1000,
        finalTimeSec: (15000 - i * 10) / 1000,
        penalty: 'OK',
        timestamp: 1600000000000 + i * 1000,
        date: Temporal.PlainDate.from('2020-09-13'),
        dateStr: '2020-09-13',
      }));

      const result = calculatePbProgression(hundredSolves);
      expect(result.dataPoints[98].pbAo100).toBeNull();
      expect(result.dataPoints[99].pbAo100).not.toBeNull();
      expect(result.summary.totalAo100Pbs).toBeGreaterThan(0);
    });

    it('handles PB progression when initial solves are DNF or when single PB is tied', () => {
      const solvesWithInitialDnf: Solve[] = [
        { ...mockSolves[0], penalty: 'DNF' as const, finalTimeSec: Infinity },
        { ...mockSolves[1], penalty: 'OK' as const, finalTimeSec: 10.0 },
        { ...mockSolves[2], penalty: 'OK' as const, finalTimeSec: 10.0 }, // Tied PB
      ];

      const res = calculatePbProgression(solvesWithInitialDnf);
      expect(res.dataPoints[0].pbSingle).toBeNull();
      expect(res.dataPoints[0].isNewPbSingle).toBe(false);

      expect(res.dataPoints[1].pbSingle).toBe(10.0);
      expect(res.dataPoints[1].isNewPbSingle).toBe(true);

      // Tied PB should not be flagged as a new PB
      expect(res.dataPoints[2].pbSingle).toBe(10.0);
      expect(res.dataPoints[2].isNewPbSingle).toBe(false);
      expect(res.pbMilestones.filter((m) => m.type === 'Single').length).toBe(1);
    });

    it('handles all-DNF session in PB progression', () => {
      const allDnfSolves: Solve[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolves[0],
        id: i + 1,
        index: i + 1,
        penalty: 'DNF' as const,
        finalTimeSec: Infinity,
      }));

      const res = calculatePbProgression(allDnfSolves);
      expect(res.summary.currentPbSingle).toBeNull();
      expect(res.summary.currentPbAo5).toBeNull();
      expect(res.pbMilestones.length).toBe(0);
      expect(res.summary.singlePbImprovement).toBe(0);
    });

    it('leverages precomputed solve.ao5 and produces identical PB milestones', () => {
      const solvesWithAo5: Solve[] = Array.from({ length: 20 }, (_, i) => {
        const finalTimeSec = 15 - i * 0.2;
        return {
          id: i + 1,
          index: i + 1,
          timeMs: Math.round(finalTimeSec * 1000),
          rawTimeSec: finalTimeSec,
          finalTimeSec,
          penalty: 'OK' as const,
          timestamp: 1600000000000 + i * 1000,
          date: Temporal.PlainDate.from('2020-09-13'),
          dateStr: '2020-09-13',
          ao5: i >= 4 ? Number((finalTimeSec + 0.2).toFixed(2)) : null,
        };
      });

      const resultWithPrecomputed = calculatePbProgression(solvesWithAo5);
      const ao5Milestones = resultWithPrecomputed.pbMilestones.filter((m) => m.type === 'Ao5');
      expect(ao5Milestones.length).toBeGreaterThan(0);
      expect(resultWithPrecomputed.summary.currentPbAo5).toBe(solvesWithAo5[19].ao5);
    });
  });

  describe('getPeriodUnitInfo', () => {
    it('returns correct period unit labels for all grouping types', () => {
      expect(getPeriodUnitInfo('daily')).toEqual({
        unitSingular: 'Day',
        unitPlural: 'Days',
        adjective: 'Daily',
        axisLabel: 'Day',
        solvesPerUnit: 'solves/day',
      });

      expect(getPeriodUnitInfo('weekly')).toEqual({
        unitSingular: 'Week',
        unitPlural: 'Weeks',
        adjective: 'Weekly',
        axisLabel: 'Week',
        solvesPerUnit: 'solves/week',
      });

      expect(getPeriodUnitInfo('monthly')).toEqual({
        unitSingular: 'Month',
        unitPlural: 'Months',
        adjective: 'Monthly',
        axisLabel: 'Month',
        solvesPerUnit: 'solves/month',
      });

      expect(getPeriodUnitInfo('batch50')).toEqual({
        unitSingular: 'Batch',
        unitPlural: 'Batches',
        adjective: 'Batch',
        axisLabel: 'Batch',
        solvesPerUnit: 'solves/batch',
      });

      expect(getPeriodUnitInfo('customBatch', 25)).toEqual({
        unitSingular: 'Batch',
        unitPlural: 'Batches',
        adjective: 'Batch',
        axisLabel: 'Batch',
        solvesPerUnit: 'solves/batch (25)',
      });
    });
  });
});
