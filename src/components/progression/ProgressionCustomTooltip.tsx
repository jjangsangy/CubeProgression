import type React from 'react';
import type { ProgressionTooltipData, SolveVisibilityMode } from './types';

export interface ProgressionCustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProgressionTooltipData }>;
  label?: string | number;
  solveVisibility?: SolveVisibilityMode;
  showAo5?: boolean;
  showAo12?: boolean;
  showAo50?: boolean;
  showAo100?: boolean;
  showCustomAo?: boolean;
  customAoN?: number;
  showTrend?: boolean;
}

export const ProgressionCustomTooltip: React.FC<ProgressionCustomTooltipProps> = ({
  active,
  payload,
  label,
  solveVisibility = 'muted',
  showAo5 = true,
  showAo12 = true,
  showAo50 = true,
  showAo100 = true,
  showCustomAo = false,
  customAoN = 25,
  showTrend = true,
}) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="max-w-xs rounded-xl border border-stone-700/80 bg-stone-900/95 p-3 text-xs text-stone-200 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 font-semibold text-stone-100">
        <span>
          Solve #{label}
          {data.periodLabel && (
            <span className="ml-1.5 text-[11px] font-normal text-sky-400">
              ({data.periodLabel})
            </span>
          )}
        </span>
        <span className="font-normal text-stone-400">{data.dateStr}</span>
      </div>
      <div className="space-y-1">
        {(data.single !== null || data.penalty === 'DNF') && solveVisibility !== 'hidden' && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-400">Single Time:</span>
            <span className="font-mono font-bold text-stone-100">
              {data.penalty === 'DNF' ? 'DNF' : `${data.single?.toFixed(2)}s`}
              {data.penalty === '+2' && <span className="ml-1 text-amber-400">(+2)</span>}
            </span>
          </div>
        )}
        {showAo5 && data.ao5 !== null && data.ao5 !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400">Ao5:</span>
            <span className="font-mono font-semibold text-emerald-300">{data.ao5.toFixed(2)}s</span>
          </div>
        )}
        {showAo12 && data.ao12 !== null && data.ao12 !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-orange-400">Ao12:</span>
            <span className="font-mono font-semibold text-orange-300">{data.ao12.toFixed(2)}s</span>
          </div>
        )}
        {showAo50 && data.ao50 !== null && data.ao50 !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sky-400">Ao50:</span>
            <span className="font-mono font-semibold text-sky-300">{data.ao50.toFixed(2)}s</span>
          </div>
        )}
        {showAo100 && data.ao100 !== null && data.ao100 !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-purple-400">Ao100:</span>
            <span className="font-mono font-semibold text-purple-300">
              {data.ao100.toFixed(2)}s
            </span>
          </div>
        )}
        {showCustomAo && data.customAo !== null && data.customAo !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-yellow-400">Ao{customAoN}:</span>
            <span className="font-mono font-semibold text-yellow-300">
              {data.customAo.toFixed(2)}s
            </span>
          </div>
        )}
        {showTrend && (
          <div className="mt-1 flex items-center justify-between gap-4 border-t border-stone-800/80 pt-1">
            <span className="text-rose-400/90">Range Trend:</span>
            <span className="font-mono text-rose-300">{data.trend?.toFixed(2)}s</span>
          </div>
        )}
      </div>
      {data.scramble && (
        <div className="mt-2.5 truncate border-t border-stone-800 pt-2 font-mono text-[10px] text-stone-400">
          Scramble: {data.scramble}
        </div>
      )}
    </div>
  );
};
