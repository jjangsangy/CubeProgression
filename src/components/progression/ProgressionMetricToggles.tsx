import { CircleDot, EyeOff, Minus, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import type React from 'react';
import type { SolveVisibilityMode } from './types';

export interface ProgressionMetricTogglesProps {
  showAo5: boolean;
  onToggleAo5: () => void;
  showAo12: boolean;
  onToggleAo12: () => void;
  showAo50: boolean;
  onToggleAo50: () => void;
  showAo100: boolean;
  onToggleAo100: () => void;
  showTrend: boolean;
  onToggleTrend: () => void;
  showCustomAo: boolean;
  onToggleCustomAo: () => void;
  customAoN: number;
  onChangeCustomAoN: (n: number) => void;
  solveVisibility: SolveVisibilityMode;
  onChangeSolveVisibility: (mode: SolveVisibilityMode) => void;
  isRangePanelOpen: boolean;
  isFiltered: boolean;
  onToggleRangePanel: () => void;
}

export const ProgressionMetricToggles: React.FC<ProgressionMetricTogglesProps> = ({
  showAo5,
  onToggleAo5,
  showAo12,
  onToggleAo12,
  showAo50,
  onToggleAo50,
  showAo100,
  onToggleAo100,
  showTrend,
  onToggleTrend,
  showCustomAo,
  onToggleCustomAo,
  customAoN,
  onChangeCustomAoN,
  solveVisibility,
  onChangeSolveVisibility,
  isRangePanelOpen,
  isFiltered,
  onToggleRangePanel,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Controls to toggle average metrics */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-stone-700/60 bg-stone-800/80 p-1 text-xs">
        <span className="px-1 text-[11px] font-medium text-stone-400">
          <span className="hidden sm:inline">Averages:</span>
          <span className="sm:hidden">Avg:</span>
        </span>
        <button
          type="button"
          aria-label="Ao5"
          aria-pressed={showAo5}
          onClick={onToggleAo5}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            showAo5
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 border border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao5</span>
          <span className="sm:hidden">5</span>
        </button>
        <button
          type="button"
          aria-label="Ao12"
          aria-pressed={showAo12}
          onClick={onToggleAo12}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            showAo12
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 border border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao12</span>
          <span className="sm:hidden">12</span>
        </button>
        <button
          type="button"
          aria-label="Ao50"
          aria-pressed={showAo50}
          onClick={onToggleAo50}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            showAo50
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 border border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao50</span>
          <span className="sm:hidden">50</span>
        </button>
        <button
          type="button"
          aria-label="Ao100"
          aria-pressed={showAo100}
          onClick={onToggleAo100}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            showAo100
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 border border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao100</span>
          <span className="sm:hidden">100</span>
        </button>
        <button
          type="button"
          aria-label="Trend"
          aria-pressed={showTrend}
          onClick={onToggleTrend}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            showTrend
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 border border-transparent'
          }`}
        >
          Trend
        </button>

        {/* Custom AoN toggle and input */}
        <div className="ml-0.5 inline-flex items-center gap-1 sm:border-l sm:border-stone-700/80 sm:pl-1.5">
          <button
            type="button"
            aria-label="Custom Ao"
            aria-pressed={showCustomAo}
            onClick={onToggleCustomAo}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showCustomAo
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 border border-transparent'
            }`}
          >
            <span className="hidden sm:inline">Custom Ao</span>
            <span className="sm:hidden">Custom</span>
          </button>
          {showCustomAo && (
            <div className="flex items-center gap-1 rounded border border-yellow-500/30 bg-stone-900 px-1.5 py-0.5">
              <span className="font-mono text-[10px] text-stone-400">Ao</span>
              <input
                type="number"
                aria-label="Custom Ao solve count"
                min="3"
                max="1000"
                value={customAoN}
                onChange={(e) => onChangeCustomAoN(Math.max(3, parseInt(e.target.value, 10) || 3))}
                className="w-10 border-b border-stone-600 bg-transparent text-center font-mono text-xs font-bold text-yellow-200 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls to toggle single solve visibility */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-stone-700/60 bg-stone-800/80 p-1 text-xs">
        <span className="px-1.5 text-[11px] font-medium text-stone-400">Solves:</span>
        <button
          type="button"
          aria-label="Muted"
          aria-pressed={solveVisibility === 'muted'}
          title="Muted: Show subtle line without dots (default clean view)"
          onClick={() => onChangeSolveVisibility('muted')}
          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            solveVisibility === 'muted'
              ? 'bg-stone-700 text-stone-100 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Minus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Muted</span>
        </button>
        <button
          type="button"
          aria-label="Unmuted"
          aria-pressed={solveVisibility === 'unmuted' || solveVisibility === 'visible'}
          title="Unmuted: Show original white line and dots"
          onClick={() => onChangeSolveVisibility('unmuted')}
          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            solveVisibility === 'unmuted' || solveVisibility === 'visible'
              ? 'bg-stone-700 text-stone-100 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <CircleDot className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Unmuted</span>
        </button>
        <button
          type="button"
          aria-label="With Dots"
          aria-pressed={solveVisibility === 'dots'}
          title="With Dots: Show subtle line with small dots"
          onClick={() => onChangeSolveVisibility('dots')}
          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            solveVisibility === 'dots'
              ? 'bg-stone-700 text-stone-100 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">With Dots</span>
        </button>
        <button
          type="button"
          aria-label="Hidden"
          aria-pressed={solveVisibility === 'hidden'}
          title="Hidden: Hide single solve line entirely"
          onClick={() => onChangeSolveVisibility('hidden')}
          className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
            solveVisibility === 'hidden'
              ? 'bg-stone-700 text-stone-100 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Hidden</span>
        </button>
      </div>

      {/* Toggle Range Panel Visibility Button */}
      <button
        type="button"
        aria-label="Range Selector"
        title="Toggle Range Selector Panel"
        onClick={onToggleRangePanel}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
          isRangePanelOpen || isFiltered
            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
            : 'bg-stone-800/80 text-stone-300 hover:text-stone-100 border-stone-700/60'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400 shrink-0" />
        <span className="hidden sm:inline">Range Selector</span>
        <span className="sm:hidden">Range</span>
        {isFiltered && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400"></span>}
      </button>
    </div>
  );
};
