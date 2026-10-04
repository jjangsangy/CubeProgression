import type React from 'react';
import { useTheme } from '../../theme';
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
  const { colors } = useTheme();
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div
      className="max-w-[240px] sm:max-w-xs rounded-xl border p-2.5 sm:p-3 text-xs shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: colors.bgCard,
        borderColor: colors.borderSubtle,
        color: colors.textPrimary,
      }}
    >
      <div
        className="mb-2 flex items-center justify-between gap-2 border-b pb-1.5 font-semibold"
        style={{ borderColor: colors.borderSubtle }}
      >
        <span>
          Solve #{label}
          {data.periodLabel && (
            <span
              className="ml-1.5 text-[11px] font-normal"
              style={{ color: colors.textSecondary }}
            >
              ({data.periodLabel})
            </span>
          )}
        </span>
        <span className="font-normal" style={{ color: colors.textMuted }}>
          {data.dateStr}
        </span>
      </div>
      <div className="space-y-1">
        {(data.single !== null || data.penalty === 'DNF') && solveVisibility !== 'hidden' && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.textSecondary }}>Single Time:</span>
            <span className="font-mono font-bold" style={{ color: colors.textPrimary }}>
              {data.penalty === 'DNF' ? 'DNF' : `${data.single?.toFixed(2)}s`}
              {data.penalty === '+2' && (
                <span className="ml-1" style={{ color: colors.accentText }}>
                  (+2)
                </span>
              )}
            </span>
          </div>
        )}
        {showAo5 && data.ao5 !== null && data.ao5 !== undefined && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.series.green }}>Ao5:</span>
            <span className="font-mono font-semibold" style={{ color: colors.series.green }}>
              {data.ao5.toFixed(2)}s
            </span>
          </div>
        )}
        {showAo12 && data.ao12 !== null && data.ao12 !== undefined && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.series.orange }}>Ao12:</span>
            <span className="font-mono font-semibold" style={{ color: colors.series.orange }}>
              {data.ao12.toFixed(2)}s
            </span>
          </div>
        )}
        {showAo50 && data.ao50 !== null && data.ao50 !== undefined && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.series.blue }}>Ao50:</span>
            <span className="font-mono font-semibold" style={{ color: colors.series.blue }}>
              {data.ao50.toFixed(2)}s
            </span>
          </div>
        )}
        {showAo100 && data.ao100 !== null && data.ao100 !== undefined && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.series.purple }}>Ao100:</span>
            <span className="font-mono font-semibold" style={{ color: colors.series.purple }}>
              {data.ao100.toFixed(2)}s
            </span>
          </div>
        )}
        {showCustomAo && data.customAo !== null && data.customAo !== undefined && (
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span style={{ color: colors.series.amber }}>Ao{customAoN}:</span>
            <span className="font-mono font-semibold" style={{ color: colors.series.amber }}>
              {data.customAo.toFixed(2)}s
            </span>
          </div>
        )}
        {showTrend && (
          <div
            className="mt-1 flex items-center justify-between gap-2 sm:gap-4 border-t pt-1"
            style={{ borderColor: colors.borderSubtle }}
          >
            <span style={{ color: colors.series.red }}>Range Trend:</span>
            <span className="font-mono" style={{ color: colors.series.red }}>
              {data.trend?.toFixed(2)}s
            </span>
          </div>
        )}
      </div>
      {data.scramble && (
        <div
          className="mt-2.5 max-w-[215px] truncate border-t pt-2 font-mono text-[10px] sm:max-w-none"
          style={{ borderColor: colors.borderSubtle, color: colors.textMuted }}
        >
          Scramble: {data.scramble}
        </div>
      )}
    </div>
  );
};
