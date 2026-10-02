import { Calendar, Filter, Hash, RotateCcw, Sparkles } from 'lucide-react';
import type React from 'react';
import type { LinearRegression } from '../../types';
import type { FocusedRangeStats, RangeMode, RangePreset } from './types';

export interface ProgressionRangeControlsProps {
  isOpen: boolean;
  rangeMode: RangeMode;
  onModeChange: (mode: RangeMode) => void;
  preset: RangePreset;
  onApplyPreset: (preset: RangePreset) => void;
  startSolve: number;
  endSolve: number;
  totalCount: number;
  onStartSolveChange: (val: number) => void;
  onEndSolveChange: (val: number) => void;
  startDate: string;
  endDate: string;
  earliestDate: string;
  latestDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  rangeStats: FocusedRangeStats;
  filteredRegression: LinearRegression;
  onResetRange: () => void;
}

export const ProgressionRangeControls: React.FC<ProgressionRangeControlsProps> = ({
  isOpen,
  rangeMode,
  onModeChange,
  preset,
  onApplyPreset,
  startSolve,
  endSolve,
  totalCount,
  onStartSolveChange,
  onEndSolveChange,
  startDate,
  endDate,
  earliestDate,
  latestDate,
  onStartDateChange,
  onEndDateChange,
  rangeStats,
  filteredRegression,
  onResetRange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="space-y-3.5 rounded-xl border border-stone-700/60 bg-stone-800/50 p-3.5 text-xs shadow-inner sm:p-4">
      {/* Top Bar: Mode Switcher & Filter Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700/50 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-stone-200">
            <Filter className="h-4 w-4 text-sky-400" />
            <span>Range Mode:</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-0.5">
            <button
              type="button"
              onClick={() => {
                onModeChange('all');
                onApplyPreset('all');
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                rangeMode === 'all'
                  ? 'bg-sky-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All Solves
            </button>
            <button
              type="button"
              onClick={() => {
                onModeChange('solveIndex');
                if (preset === 'all') onApplyPreset('last100');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                rangeMode === 'solveIndex'
                  ? 'bg-sky-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Hash className="h-3 w-3" />
              <span>Solve # Interval</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onModeChange('dateRange');
                if (preset === 'all') onApplyPreset('last30d');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                rangeMode === 'dateRange'
                  ? 'bg-sky-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Date Range</span>
            </button>
          </div>
        </div>

        {/* Reset Range Button */}
        {rangeStats.isFiltered && (
          <button
            type="button"
            onClick={onResetRange}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/25 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>
              Reset Range ({rangeStats.count} / {totalCount})
            </span>
          </button>
        )}
      </div>

      {/* Presets Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[11px] font-medium text-stone-400">Quick Presets:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: 'All Solves' },
            { key: 'last50', label: 'Last 50' },
            { key: 'last100', label: 'Last 100' },
            { key: 'last200', label: 'Last 200' },
            { key: 'first100', label: 'First 100' },
            { key: 'last7d', label: 'Last 7 Days' },
            { key: 'last30d', label: 'Last 30 Days' },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onApplyPreset(p.key as RangePreset)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                preset === p.key
                  ? 'bg-stone-100 text-stone-900 font-bold shadow'
                  : 'bg-stone-900/60 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Controls Based on Selected Mode */}
      {rangeMode === 'solveIndex' && (
        <div className="space-y-3 rounded-lg border border-stone-700/50 bg-stone-900/80 p-3">
          <div className="flex flex-col items-center gap-4 md:flex-row">
            {/* Start Solve Input & Slider */}
            <div className="flex w-full min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 font-mono text-[11px] text-stone-400">From Solve #:</span>
              <input
                type="number"
                min={1}
                max={endSolve}
                value={startSolve}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  onStartSolveChange(Math.max(1, Math.min(val, endSolve)));
                }}
                className="w-16 rounded border border-stone-700 bg-stone-950 px-2 py-0.5 text-center font-mono text-xs text-stone-100 focus:border-sky-500 focus:outline-none"
              />
              <input
                type="range"
                min={1}
                max={totalCount}
                value={startSolve}
                style={{ touchAction: 'pan-x' }}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val <= endSolve) {
                    onStartSolveChange(val);
                  }
                }}
                className="h-2 flex-1 cursor-pointer rounded-lg bg-stone-800 accent-sky-400 sm:h-1.5"
              />
            </div>

            {/* End Solve Input & Slider */}
            <div className="flex w-full min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 font-mono text-[11px] text-stone-400">To Solve #:</span>
              <input
                type="number"
                min={startSolve}
                max={totalCount}
                value={endSolve}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || totalCount;
                  onEndSolveChange(Math.min(totalCount, Math.max(val, startSolve)));
                }}
                className="w-16 rounded border border-stone-700 bg-stone-950 px-2 py-0.5 text-center font-mono text-xs text-stone-100 focus:border-sky-500 focus:outline-none"
              />
              <input
                type="range"
                min={1}
                max={totalCount}
                value={endSolve}
                style={{ touchAction: 'pan-x' }}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= startSolve) {
                    onEndSolveChange(val);
                  }
                }}
                className="h-2 flex-1 cursor-pointer rounded-lg bg-stone-800 accent-sky-400 sm:h-1.5"
              />
            </div>
          </div>
        </div>
      )}

      {rangeMode === 'dateRange' && (
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/80 p-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-medium text-stone-400">Start Date:</span>
              <input
                type="date"
                value={startDate}
                min={earliestDate}
                max={endDate || latestDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="rounded border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-xs text-stone-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-medium text-stone-400">End Date:</span>
              <input
                type="date"
                value={endDate}
                min={startDate || earliestDate}
                max={latestDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="rounded border border-stone-700 bg-stone-950 px-2 py-1 font-mono text-xs text-stone-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-stone-400 italic">
              (Earliest: {earliestDate} &bull; Latest: {latestDate})
            </span>
          </div>
        </div>
      )}

      {/* Focused Range Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-700/60 bg-stone-900/90 p-2.5 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-stone-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-sans text-[11px] font-medium text-stone-400">Range Focus:</span>
          <span className="font-bold text-sky-300">
            {rangeMode === 'dateRange'
              ? `${startDate || earliestDate} – ${endDate || latestDate}`
              : `Solves #${startSolve} – #${endSolve}`}
          </span>
          <span className="text-[11px] text-stone-500">
            ({rangeStats.count} solves &bull; {rangeStats.pctOfTotal}% of total)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-stone-300">
            <span className="text-stone-400">Mean:</span>
            <span className="font-bold text-stone-100">{rangeStats.meanSec}s</span>
          </div>
          <div className="flex items-center gap-1 text-stone-300">
            <span className="text-stone-400">Best:</span>
            <span className="font-bold text-emerald-400">{rangeStats.bestSec}s</span>
          </div>
          <div className="flex items-center gap-1 border-l border-stone-700/80 pl-2.5">
            <span className="text-stone-400">Range Slope:</span>
            <span
              className={`font-bold ${filteredRegression.slope <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {filteredRegression.slopeFormatted}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Range R²:</span>
            <span className="font-semibold text-sky-300">
              {(filteredRegression.r2 * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
