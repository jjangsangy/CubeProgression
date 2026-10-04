import { CircleDot, EyeOff, Minus, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import type React from 'react';
import { useTheme } from '../../theme';
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
  const { colors } = useTheme();

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
          id="progression-ao5"
          aria-label="Ao5"
          aria-pressed={showAo5}
          onClick={onToggleAo5}
          style={
            showAo5
              ? {
                  backgroundColor: `${colors.series.green}26`,
                  borderColor: `${colors.series.green}66`,
                  color: colors.series.green,
                }
              : undefined
          }
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showAo5 ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao5</span>
          <span className="sm:hidden">5</span>
        </button>
        <button
          type="button"
          id="progression-ao12"
          aria-label="Ao12"
          aria-pressed={showAo12}
          onClick={onToggleAo12}
          style={
            showAo12
              ? {
                  backgroundColor: `${colors.series.orange}26`,
                  borderColor: `${colors.series.orange}66`,
                  color: colors.series.orange,
                }
              : undefined
          }
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showAo12 ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao12</span>
          <span className="sm:hidden">12</span>
        </button>
        <button
          type="button"
          id="progression-ao50"
          aria-label="Ao50"
          aria-pressed={showAo50}
          onClick={onToggleAo50}
          style={
            showAo50
              ? {
                  backgroundColor: `${colors.series.blue}26`,
                  borderColor: `${colors.series.blue}66`,
                  color: colors.series.blue,
                }
              : undefined
          }
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showAo50 ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao50</span>
          <span className="sm:hidden">50</span>
        </button>
        <button
          type="button"
          id="progression-ao100"
          aria-label="Ao100"
          aria-pressed={showAo100}
          onClick={onToggleAo100}
          style={
            showAo100
              ? {
                  backgroundColor: `${colors.series.purple}26`,
                  borderColor: `${colors.series.purple}66`,
                  color: colors.series.purple,
                }
              : undefined
          }
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showAo100 ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
          }`}
        >
          <span className="hidden sm:inline">Ao100</span>
          <span className="sm:hidden">100</span>
        </button>
        <button
          type="button"
          id="progression-trend"
          aria-label="Trend"
          aria-pressed={showTrend}
          onClick={onToggleTrend}
          style={
            showTrend
              ? {
                  backgroundColor: `${colors.series.red}26`,
                  borderColor: `${colors.series.red}66`,
                  color: colors.series.red,
                }
              : undefined
          }
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showTrend ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
          }`}
        >
          Trend
        </button>

        {/* Custom AoN toggle and input */}
        <div className="ml-0.5 inline-flex items-center gap-1 sm:border-l sm:border-stone-700/80 sm:pl-1.5">
          <button
            type="button"
            id="progression-custom-ao"
            aria-label="Custom Ao"
            aria-pressed={showCustomAo}
            onClick={onToggleCustomAo}
            style={
              showCustomAo
                ? {
                    backgroundColor: `${colors.series.amber}26`,
                    borderColor: `${colors.series.amber}66`,
                    color: colors.series.amber,
                  }
                : undefined
            }
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
              showCustomAo ? 'shadow-sm' : 'text-stone-400 hover:text-stone-200 border-transparent'
            }`}
          >
            <span className="hidden sm:inline">Custom Ao</span>
            <span className="sm:hidden">Custom</span>
          </button>
          {showCustomAo && (
            <div
              className="flex items-center gap-1 rounded border border-yellow-500/30 bg-stone-900 px-1.5 py-0.5"
              style={{ borderColor: `${colors.series.amber}50` }}
            >
              <span className="font-mono text-[10px] text-stone-400">Ao</span>
              <input
                type="number"
                id="progression-custom-ao-input"
                aria-label="Custom Ao solve count"
                min="3"
                max="1000"
                value={customAoN}
                onChange={(e) => onChangeCustomAoN(Math.max(3, parseInt(e.target.value, 10) || 3))}
                className="w-10 border-b border-stone-600 bg-transparent text-center font-mono text-xs font-bold text-yellow-200 focus:border-yellow-400 focus:outline-none"
                style={{ color: colors.series.amber }}
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
          id="progression-muted"
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
          id="progression-unmuted"
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
          id="progression-dots"
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
          id="progression-hidden"
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
        id="progression-range-selector"
        aria-label="Range Selector"
        title="Toggle Range Selector Panel"
        onClick={onToggleRangePanel}
        style={
          isRangePanelOpen || isFiltered
            ? {
                backgroundColor: `${colors.accent}26`,
                borderColor: `${colors.accent}66`,
                color: colors.accentText,
              }
            : undefined
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
          isRangePanelOpen || isFiltered
            ? 'shadow-sm'
            : 'bg-stone-800/80 text-stone-300 hover:text-stone-100 border-stone-700/60'
        }`}
      >
        <SlidersHorizontal
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: isRangePanelOpen || isFiltered ? colors.accent : undefined }}
        />
        <span className="hidden sm:inline">Range Selector</span>
        <span className="sm:hidden">Range</span>
        {isFiltered && (
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-amber-400"
            style={{ backgroundColor: colors.accent }}
          ></span>
        )}
      </button>
    </div>
  );
};
