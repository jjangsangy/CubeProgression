import { describe, it, expect } from 'vitest';
import {
  calculateAoN,
  calculateLinearRegression,
  computeGroupStats,
  groupSolvesByPeriod,
  calculateKDE,
  calculateGlobalStats,
  calculatePbProgression,
} from './statsMath';
import { Solve } from '../types';

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

    it('returns null if DNF count exceeds max allowed DNFs', () => {
      const solvesWith2DNF: Solve[] = [
        ...mockSolves.slice(0, 3),
        { ...mockSolves[3], penalty: 'DNF' },
        { ...mockSolves[4], penalty: 'DNF' },
      ];
      // 2 DNFs in Ao5 -> exceeds max 1 DNF
      expect(calculateAoN(solvesWith2DNF, 4, 5)).toBeNull();
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
      const dnfSolves = [
        { ...mockSolves[0], penalty: 'DNF' as const },
      ];
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
      expect(monthlyGroups[0].label).toContain('Sep 2020');
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
  });

  describe('calculatePbProgression', () => {
    it('accurately calculates running Personal Bests and milestones', () => {
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

      // Solve 3: PB Single remains 10.0
      expect(result.dataPoints[2].pbSingle).toBe(10.0);
      expect(result.dataPoints[2].isNewPbSingle).toBe(false);

      // Ao5 on Solve 5 (index 4) should be 12.0
      expect(result.summary.currentPbAo5).toBe(12.0);
      expect(result.summary.currentPbSingle).toBe(10.0);
      expect(result.pbMilestones.length).toBeGreaterThan(0);
    });
  });
});

