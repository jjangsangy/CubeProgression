import { describe, expect, it } from 'vitest';
import type { Solve } from '../types';
import {
  calculateAoN,
  calculateGlobalStats,
  calculateKDE,
  calculateLinearRegression,
  calculatePbProgression,
  computeGroupStats,
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
    date: new Date(1600000000000),
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
    date: new Date(1600000100000),
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
    date: new Date(1600000200000),
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
    date: new Date(1600000300000),
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
    date: new Date(1600000400000),
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
      const stats = computeGroupStats(dnfSolves, 'Group 1', new Date(), new Date());
      expect(stats.mean).toBe(0);
      expect(stats.solves).toEqual(dnfSolves);
      expect(stats.outliers).toEqual([]);
    });

    it('calculates mean, median, quantiles, and outliers accurately', () => {
      const stats = computeGroupStats(mockSolves, 'Group 1', new Date(), new Date());
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

      const stats = computeGroupStats(solvesWithOutliers, 'Outlier Group', new Date(), new Date());
      expect(stats.outliers).toEqual([2.0, 25.0]);
      expect(stats.whiskerLow).toBe(10.0);
      expect(stats.whiskerHigh).toBe(13.0);
    });

    it('handles single solve and identical solves without errors', () => {
      const singleSolve = [mockSolves[0]];
      const singleStats = computeGroupStats(singleSolve, 'Single', new Date(), new Date());
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
      const identicalStats = computeGroupStats(
        identicalSolves,
        'Identical',
        new Date(),
        new Date(),
      );
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
      // Solve 1 at 12:00, Solve 2 at 10:00 (earlier timestamp encountered second)
      const outOfOrderSolves: Solve[] = [
        { ...mockSolves[0], timestamp: 1600005000000, date: new Date(1600005000000) },
        { ...mockSolves[1], timestamp: 1600001000000, date: new Date(1600001000000) },
      ];
      const groups = groupSolvesByPeriod(outOfOrderSolves, 'daily');
      expect(groups.length).toBe(1);
      expect(groups[0].startDate.getTime()).toBe(1600001000000);
      expect(groups[0].endDate.getTime()).toBe(1600005000000);
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
        date: new Date(1600000000000 + i * 1000),
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
