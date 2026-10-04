import { Activity, Target, TrendingDown, Trophy, Zap } from 'lucide-react';
import type React from 'react';
import { useTheme } from '../theme/ThemeContext';
import type { GlobalStats } from '../types';

interface MetricsOverviewCardsProps {
  stats: GlobalStats;
  sessionName: string;
}

export const MetricsOverviewCards: React.FC<MetricsOverviewCardsProps> = ({
  stats,
  sessionName: _sessionName,
}) => {
  const { colors } = useTheme();

  return (
    <div id="metrics-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Best Single */}
      <div
        id="metric-best-single"
        className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-3.5 sm:p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Best Single
          </span>
          <div
            className="rounded-xl bg-amber-500/10 p-2 text-amber-400"
            style={{ backgroundColor: `${colors.series.amber}20`, color: colors.series.amber }}
          >
            <Trophy className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="font-mono text-2xl font-black text-stone-100">
            {stats.bestSingle ? `${stats.bestSingle.finalTimeSec.toFixed(2)}s` : 'N/A'}
          </div>
          <p className="mt-1 truncate text-[11px] text-stone-400">
            {stats.bestSingle?.dateStr ? (
              <>
                <span className="hidden sm:inline">Achieved on </span>
                <span>{stats.bestSingle.dateStr}</span>
              </>
            ) : (
              'No valid solves'
            )}
          </p>
        </div>
      </div>

      {/* 2. Best Ao12 & Best Ao50 */}
      <div
        id="metric-best-averages"
        className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-3.5 sm:p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Best Averages
          </span>
          <div
            className="rounded-xl bg-sky-500/10 p-2 text-sky-400"
            style={{
              backgroundColor: `${colors.series.blue}20`,
              color: colors.series.blue,
            }}
          >
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div>
            <span
              className="block font-mono text-xl font-black text-orange-400"
              style={{ color: colors.series.orange }}
            >
              {stats.bestAo12 ? `${stats.bestAo12.toFixed(2)}s` : '—'}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-stone-400">Ao12</span>
          </div>
          <div className="border-l border-stone-700/80 pl-3">
            <span
              className="block font-mono text-xl font-black text-sky-400"
              style={{ color: colors.series.blue }}
            >
              {stats.bestAo50 ? `${stats.bestAo50.toFixed(2)}s` : '—'}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-stone-400">Ao50</span>
          </div>
        </div>
      </div>

      {/* 3. Regression Slope */}
      <div
        id="metric-overall-rate"
        className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-3.5 sm:p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Overall Rate
          </span>
          <div
            className="rounded-xl bg-rose-500/10 p-2 text-rose-400"
            style={{
              backgroundColor: `${colors.series.red}20`,
              color: colors.series.red,
            }}
          >
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div
            className={`font-mono text-base sm:text-xl lg:text-[15px] xl:text-xl font-black tracking-tight truncate ${
              stats.regression.slope <= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.regression.slopeFormatted}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            <span className="hidden sm:inline">Linear OLS trend rate</span>
            <span className="sm:hidden">OLS trend rate</span>
          </p>
        </div>
      </div>

      {/* 4. Speed Gain (First vs Last sample) */}
      <div
        id="metric-progression-gain"
        className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-3.5 sm:p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Progression Gain
          </span>
          <div
            className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400"
            style={{ backgroundColor: `${colors.series.green}20`, color: colors.series.green }}
          >
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-xl font-black text-stone-100">
            <span>
              {stats.improvementSec > 0
                ? `-${stats.improvementSec}s`
                : stats.improvementSec < 0
                  ? `+${Math.abs(stats.improvementSec)}s`
                  : '0s'}
            </span>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                stats.improvementPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({stats.improvementPct > 0 ? `+${stats.improvementPct}%` : `${stats.improvementPct}%`}
              )
            </span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            <span className="hidden sm:inline">
              Baseline ({stats.initialAvg}s) vs Recent ({stats.recentAvg}s)
            </span>
            <span className="sm:hidden">
              Base {stats.initialAvg}s &rarr; Recent {stats.recentAvg}s
            </span>
          </p>
        </div>
      </div>

      {/* 5. Session Solves Summary */}
      <div
        id="metric-session-solves"
        className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-3.5 sm:p-4 shadow-lg sm:col-span-2 lg:col-span-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Session Solves
          </span>
          <div
            className="rounded-xl bg-purple-500/10 p-2 text-purple-400"
            style={{ backgroundColor: `${colors.series.purple}20`, color: colors.series.purple }}
          >
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="font-mono text-2xl font-black text-stone-100">
            {stats.totalSolves} <span className="text-xs font-normal text-stone-400">solves</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            {stats.dnfCount > 0 ? `${stats.dnfCount} DNFs` : '0 DNFs'} &bull; Mean{' '}
            {stats.overallMean}s
          </p>
        </div>
      </div>
    </div>
  );
};
