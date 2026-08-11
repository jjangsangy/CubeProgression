export interface RawSolve {
  // csTimer raw solve array format: [[penalty, time_ms], scramble, comment, timestamp]
  // or [[penalty, time_ms], timestamp]
  // penalty: 0 = OK, 2000 or 2 = +2, -1 = DNF
  0: [number, number]; // [penalty_code, time_in_ms]
  1?: string | number;  // scramble or timestamp
  2?: string | number;  // comment or timestamp
  3?: number;           // timestamp in seconds or ms
}

export interface Solve {
  id: number;
  index: number; // 1-based solve index
  timeMs: number;
  rawTimeSec: number;
  finalTimeSec: number; // includes +2 if applicable
  penalty: 'OK' | '+2' | 'DNF';
  scramble?: string;
  comment?: string;
  timestamp: number; // Unix timestamp in ms
  date: Date;
  dateStr: string; // YYYY-MM-DD format
  ao5?: number | null;
  ao12?: number | null;
  ao50?: number | null;
  ao100?: number | null;
}

export interface Session {
  id: string;
  name: string;
  solves: Solve[];
  stat?: any;
}

export type GroupingPeriod = 'daily' | 'weekly' | 'monthly' | 'customBatch' | 'batch50';

export interface PeriodGroup {
  label: string; // e.g. "Day 1", "2026-08-01", "Week 32", "Batch 1 (1-50)"
  startDate: Date;
  endDate: Date;
  solves: Solve[];
  timesSec: number[]; // valid non-DNF times
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

export interface LinearRegression {
  slope: number; // seconds per solve
  intercept: number;
  r2: number;
  slopeFormatted: string; // e.g. "-0.0095s/solve"
}

export interface KDEPoint {
  x: number; // solve time in seconds
  baselineDensity: number;
  recentDensity: number;
}

export interface PbDataPoint {
  index: number;
  dateStr: string;
  timestamp: number;
  single: number | null;
  scramble?: string;
  penalty: 'OK' | '+2' | 'DNF';
  pbSingle: number | null;
  pbAo5: number | null;
  pbAo12: number | null;
  pbAo50: number | null;
  pbAo100: number | null;
  isNewPbSingle: boolean;
  isNewPbAo5: boolean;
  isNewPbAo12: boolean;
  isNewPbAo50: boolean;
  isNewPbAo100: boolean;
  dropSingle?: number;
  dropAo5?: number;
  dropAo12?: number;
  dropAo50?: number;
  dropAo100?: number;
}

export interface PbMilestone {
  index: number;
  dateStr: string;
  type: 'Single' | 'Ao5' | 'Ao12' | 'Ao50' | 'Ao100';
  timeSec: number;
  dropSec: number;
  scramble?: string;
}

export interface PbSummary {
  currentPbSingle: number | null;
  currentPbAo5: number | null;
  currentPbAo12: number | null;
  currentPbAo50: number | null;
  currentPbAo100: number | null;
  totalSinglePbs: number;
  totalAo5Pbs: number;
  totalAo12Pbs: number;
  totalAo50Pbs: number;
  totalAo100Pbs: number;
  singlePbImprovement: number;
}

export interface PbProgressionResult {
  dataPoints: PbDataPoint[];
  summary: PbSummary;
  pbMilestones: PbMilestone[];
}

export interface GlobalStats {
  totalSolves: number;
  dnfCount: number;
  bestSingle: Solve | null;
  worstSingle: Solve | null;
  bestAo5: number | null;
  bestAo12: number | null;
  bestAo50: number | null;
  currentAo5: number | null;
  currentAo12: number | null;
  overallMean: number;
  overallMedian: number;
  regression: LinearRegression;
  initialAvg: number; // First ~10% avg
  recentAvg: number;  // Last ~10% avg
  improvementSec: number;
  improvementPct: number;
}
