import type { PeriodGroup } from '../types';

export function buildPeriodStatsCsv(periodGroups: PeriodGroup[]): string {
  if (!periodGroups.length) return '';

  const header = 'Period,Solves,Mean(s),Median(s),Min(s),Max(s),Q1(s),Q3(s),StdDev(s)';
  const rows = periodGroups.map((g) =>
    [`"${g.label}"`, g.solves.length, g.mean, g.median, g.min, g.max, g.q1, g.q3, g.stdDev].join(
      ',',
    ),
  );

  return `${[header, ...rows].join('\n')}\n`;
}

export function exportPeriodStatsCsv(periodGroups: PeriodGroup[], sessionName?: string): boolean {
  if (!periodGroups.length || typeof document === 'undefined') return false;

  const rawCsv = buildPeriodStatsCsv(periodGroups);
  const csvContent = `data:text/csv;charset=utf-8,${rawCsv}`;
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${sessionName || 'csTimer'}_period_stats.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
