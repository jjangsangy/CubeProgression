import type { GroupingPeriod, LinearRegression, PeriodGroup, Solve } from '../../types';

export type SolveVisibilityMode = 'muted' | 'unmuted' | 'dots' | 'hidden' | 'visible';
export type RangeMode = 'all' | 'solveIndex' | 'dateRange';
export type RangePreset =
  | 'all'
  | 'last50'
  | 'last100'
  | 'last200'
  | 'first100'
  | 'last7d'
  | 'last30d'
  | 'custom';

export interface ProgressionChartProps {
  solves: Solve[];
  periodGroups: PeriodGroup[];
  regression: LinearRegression;
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export interface FocusedRangeStats {
  count: number;
  isFiltered: boolean;
  meanSec: string;
  bestSec: string;
  pctOfTotal: string;
  slope: number;
  slopeFormatted: string;
  r2: number;
}

export interface ProgressionTooltipData {
  periodLabel?: string;
  dateStr: string;
  single?: number | null;
  penalty?: string;
  ao5?: number | null;
  ao12?: number | null;
  ao50?: number | null;
  ao100?: number | null;
  customAo?: number | null;
  trend?: number | null;
  scramble?: string;
  comment?: string;
}

export interface ProgressionDataPoint {
  index: number;
  single: number | null;
  ao5: number | null;
  ao12: number | null;
  ao50: number | null;
  ao100: number | null;
  customAo: number | null;
  trend: number;
  dateStr: string;
  scramble?: string;
  penalty?: string;
  periodNumber?: number;
  periodLabel?: string;
}

export interface PeriodBoundaryItem {
  index: number;
  periodNumber: number;
  label: string;
  groupLabel: string;
  midIndex: number;
}

export interface ResponsiveBoundaryInfo {
  boundaries: PeriodBoundaryItem[];
  step: number;
  isDownsampled: boolean;
  totalCount: number;
}

export interface SingleLineStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
  dot:
    | boolean
    | {
        r: number;
        fill: string;
        stroke: string;
        strokeWidth?: number;
        fillOpacity?: number;
      };
}
