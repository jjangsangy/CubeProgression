import { describe, expect, it } from 'vitest';
import type { LinearRegression, PeriodGroup, Solve } from '../../types';
import {
  buildProgressionChartData,
  buildSolvePeriodMap,
  calculateProgressionYDomain,
  calculateRangeStats,
  computeRawPeriodBoundaries,
  downsampleBoundaryTicks,
  filterSolvesByRange,
  getSingleLineStyle,
} from './progressionMath';
import type { PeriodBoundaryItem } from './types';

const mockSolves: Solve[] = Array.from({ length: 50 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 10000 + idx * 10,
  rawTimeSec: (10000 + idx * 10) / 1000,
  finalTimeSec: idx === 0 ? Infinity : (10000 + idx * 10) / 1000,
  penalty: idx === 0 ? 'DNF' : 'OK',
  timestamp: 1600000000000 + idx * 86400000,
  date: new Date(1600000000000 + idx * 86400000),
  dateStr: new Date(1600000000000 + idx * 86400000).toISOString().split('T')[0],
  scramble: `R U R' U' #${idx + 1}`,
}));

describe('progressionMath pure helpers', () => {
  describe('filterSolvesByRange', () => {
    it('returns empty array when solves is empty', () => {
      expect(filterSolvesByRange([], 'all', 1, 10, '', '')).toEqual([]);
    });

    it('returns all solves when rangeMode is all', () => {
      const result = filterSolvesByRange(mockSolves, 'all', 1, 10, '', '');
      expect(result).toHaveLength(50);
    });

    it('filters by solveIndex clamped to bounds', () => {
      const result = filterSolvesByRange(mockSolves, 'solveIndex', 10, 20, '', '');
      expect(result).toHaveLength(11);
      expect(result[0].index).toBe(10);
      expect(result[result.length - 1].index).toBe(20);
    });

    it('filters by dateRange', () => {
      const start = mockSolves[5].dateStr;
      const end = mockSolves[10].dateStr;
      const result = filterSolvesByRange(mockSolves, 'dateRange', 1, 50, start, end);
      expect(result).toHaveLength(6);

      // No start or end date returns all
      expect(filterSolvesByRange(mockSolves, 'dateRange', 1, 50, '', '')).toHaveLength(50);
    });
  });

  describe('calculateRangeStats', () => {
    it('calculates mean, best, count, and percentage', () => {
      const stats = calculateRangeStats(mockSolves, 100);
      expect(stats.count).toBe(50);
      expect(stats.isFiltered).toBe(true);
      expect(Number(stats.pctOfTotal)).toBe(50);
      expect(stats.meanSec).not.toBe('-');
      expect(stats.bestSec).not.toBe('-');
    });

    it('handles all DNF or empty array gracefully', () => {
      const dnfSolves = mockSolves.slice(0, 1); // only the DNF solve
      const stats = calculateRangeStats(dnfSolves, 50);
      expect(stats.meanSec).toBe('-');
      expect(stats.bestSec).toBe('-');

      const emptyStats = calculateRangeStats([], 0);
      expect(emptyStats.pctOfTotal).toBe('100');
    });
  });

  describe('downsampleBoundaryTicks', () => {
    it('returns empty boundaries when given 0 boundaries', () => {
      const result = downsampleBoundaryTicks([], 1000);
      expect(result.boundaries).toEqual([]);
      expect(result.isDownsampled).toBe(false);
    });

    it('does not downsample when count is small', () => {
      const items: PeriodBoundaryItem[] = [
        { index: 10, periodNumber: 1, label: 'Day 1', groupLabel: 'Day 1', midIndex: 5 },
        { index: 20, periodNumber: 2, label: 'Day 2', groupLabel: 'Day 2', midIndex: 15 },
      ];
      const result = downsampleBoundaryTicks(items, 1000);
      expect(result.isDownsampled).toBe(false);
      expect(result.boundaries).toHaveLength(2);
    });

    it('downsamples boundaries when count exceeds maxTicks', () => {
      const items: PeriodBoundaryItem[] = Array.from({ length: 100 }, (_, idx) => ({
        index: (idx + 1) * 10,
        periodNumber: idx + 1,
        label: `Day ${idx + 1}`,
        groupLabel: `Day ${idx + 1}`,
        midIndex: (idx + 1) * 10 - 5,
      }));

      // narrow screen width forces downsampling
      const result = downsampleBoundaryTicks(items, 320);
      expect(result.isDownsampled).toBe(true);
      expect(result.step).toBeGreaterThan(1);
      expect(result.boundaries.length).toBeLessThan(100);
    });
  });

  describe('calculateProgressionYDomain', () => {
    it('returns min and max Y bounds based on active series', () => {
      const chartData = [
        {
          index: 1,
          single: 12.5,
          ao5: 12.0,
          ao12: 12.2,
          ao50: null,
          ao100: null,
          customAo: 11.8,
          trend: 12.1,
          dateStr: '2020-01-01',
        },
      ];

      const { minY, maxY } = calculateProgressionYDomain(chartData, {
        solveVisibility: 'muted',
        showAo5: true,
        showAo12: true,
        showAo50: false,
        showAo100: false,
        showCustomAo: true,
        showTrend: true,
      });

      expect(minY).toBeLessThan(12.0);
      expect(maxY).toBeGreaterThan(12.5);
    });

    it('defaults to [0, 50] when chartData has no active numeric values', () => {
      const { minY, maxY } = calculateProgressionYDomain([], {
        solveVisibility: 'hidden',
        showAo5: false,
        showAo12: false,
        showAo50: false,
        showAo100: false,
        showCustomAo: false,
        showTrend: false,
      });

      expect(minY).toBe(0);
      expect(maxY).toBe(50);
    });
  });

  describe('getSingleLineStyle', () => {
    it('returns transparent style for hidden mode', () => {
      const style = getSingleLineStyle('hidden');
      expect(style.stroke).toBe('transparent');
      expect(style.dot).toBe(false);
    });

    it('returns styled dot for unmuted and visible modes', () => {
      const unmuted = getSingleLineStyle('unmuted');
      const visible = getSingleLineStyle('visible');
      expect(typeof unmuted.dot).toBe('object');
      expect(typeof visible.dot).toBe('object');
    });

    it('returns small dot for dots mode', () => {
      const dots = getSingleLineStyle('dots');
      expect(typeof dots.dot).toBe('object');
    });

    it('returns default muted style for muted mode', () => {
      const muted = getSingleLineStyle('muted');
      expect(muted.dot).toBe(false);
    });
  });

  describe('buildSolvePeriodMap & buildProgressionChartData', () => {
    it('maps period groups and builds chart data points', () => {
      const periodGroups: PeriodGroup[] = [
        {
          label: 'Group 1',
          startDate: new Date(1600000000000),
          endDate: new Date(1600000000000 + 86400000),
          solves: mockSolves.slice(0, 10),
          timesSec: mockSolves.slice(0, 10).map((s) => s.finalTimeSec),
          mean: 10.0,
          median: 10.0,
          min: 9.0,
          max: 11.0,
          stdDev: 0.5,
          q1: 9.5,
          q3: 10.5,
          iqr: 1.0,
          whiskerLow: 9.0,
          whiskerHigh: 11.0,
          outliers: [],
        },
      ];

      const periodMap = buildSolvePeriodMap(periodGroups, 'Day');
      expect(periodMap.get(1)?.periodNumber).toBe(1);
      expect(periodMap.get(1)?.periodLabel).toBe('Group 1');

      const mockReg: LinearRegression = {
        slope: -0.01,
        intercept: 10.5,
        r2: 0.9,
        slopeFormatted: '-0.0100s/solve',
      };

      const chartData = buildProgressionChartData(
        mockSolves.slice(0, 10),
        mockSolves,
        mockReg,
        periodMap,
        true,
        5,
      );

      expect(chartData).toHaveLength(10);
      expect(chartData[0].periodLabel).toBe('Group 1');
      expect(chartData[0].single).toBeNull(); // index 0 was DNF
      expect(chartData[1].single).toBe(mockSolves[1].finalTimeSec);
    });
  });

  describe('computeRawPeriodBoundaries', () => {
    it('computes raw boundaries matching filtered solves', () => {
      const periodGroups: PeriodGroup[] = [
        {
          label: 'Group 1',
          startDate: new Date(1600000000000),
          endDate: new Date(1600000000000 + 86400000),
          solves: mockSolves.slice(0, 10),
          timesSec: mockSolves.slice(0, 10).map((s) => s.finalTimeSec),
          mean: 10.0,
          median: 10.0,
          min: 9.0,
          max: 11.0,
          stdDev: 0.5,
          q1: 9.5,
          q3: 10.5,
          iqr: 1.0,
          whiskerLow: 9.0,
          whiskerHigh: 11.0,
          outliers: [],
        },
      ];

      const boundaries = computeRawPeriodBoundaries(periodGroups, mockSolves, 'Day');
      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].index).toBe(10);
      expect(boundaries[0].label).toBe('Day 1');
    });
  });
});
