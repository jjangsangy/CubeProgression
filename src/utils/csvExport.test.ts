import { describe, expect, it, vi } from 'vitest';
import type { PeriodGroup } from '../types';
import { buildPeriodStatsCsv, exportPeriodStatsCsv } from './csvExport';

describe('csvExport', () => {
  const sampleGroups: PeriodGroup[] = [
    {
      label: 'Day 1 (Jan 01, 2026)',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-01T23:59:59Z'),
      solves: [],
      timesSec: [],
      mean: 12.34,
      median: 12.1,
      min: 10.0,
      max: 15.5,
      q1: 11.2,
      q3: 13.4,
      iqr: 2.2,
      whiskerLow: 10.0,
      whiskerHigh: 15.5,
      outliers: [],
      stdDev: 1.25,
    },
    {
      label: 'Day 2 (Jan 02, 2026)',
      startDate: new Date('2026-01-02T00:00:00Z'),
      endDate: new Date('2026-01-02T23:59:59Z'),
      solves: [],
      timesSec: [],
      mean: 11.5,
      median: 11.2,
      min: 9.8,
      max: 14.1,
      q1: 10.5,
      q3: 12.3,
      iqr: 1.8,
      whiskerLow: 9.8,
      whiskerHigh: 14.1,
      outliers: [],
      stdDev: 0.95,
    },
  ];

  it('buildPeriodStatsCsv returns empty string when groups array is empty', () => {
    expect(buildPeriodStatsCsv([])).toBe('');
  });

  it('buildPeriodStatsCsv formats header and data rows correctly', () => {
    const csv = buildPeriodStatsCsv(sampleGroups);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe('Period,Solves,Mean(s),Median(s),Min(s),Max(s),Q1(s),Q3(s),StdDev(s)');
    expect(lines[1]).toBe('"Day 1 (Jan 01, 2026)",0,12.34,12.1,10,15.5,11.2,13.4,1.25');
    expect(lines[2]).toBe('"Day 2 (Jan 02, 2026)",0,11.5,11.2,9.8,14.1,10.5,12.3,0.95');
  });

  it('exportPeriodStatsCsv returns false and does not create an anchor when groups are empty', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const result = exportPeriodStatsCsv([]);
    expect(result).toBe(false);
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('exportPeriodStatsCsv generates download link and clicks it', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const captured: { anchor: HTMLAnchorElement | null } = { anchor: null };
    const originalAppend = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        captured.anchor = node;
      }
      return originalAppend(node);
    });

    const result = exportPeriodStatsCsv(sampleGroups, 'MySession');

    expect(result).toBe(true);
    expect(clickSpy).toHaveBeenCalled();
    expect(captured.anchor).not.toBeNull();
    expect(captured.anchor?.getAttribute('download')).toBe('MySession_period_stats.csv');

    const href = decodeURI(captured.anchor?.getAttribute('href') ?? '');
    expect(href).toContain('data:text/csv;charset=utf-8,');
    expect(href).toContain('"Day 1 (Jan 01, 2026)"');

    clickSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('exportPeriodStatsCsv uses default csTimer filename when sessionName is omitted', () => {
    const captured: { anchor: HTMLAnchorElement | null } = { anchor: null };
    const originalAppend = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        captured.anchor = node;
      }
      return originalAppend(node);
    });

    exportPeriodStatsCsv(sampleGroups);
    expect(captured.anchor?.getAttribute('download')).toBe('csTimer_period_stats.csv');
    vi.restoreAllMocks();
  });
});
