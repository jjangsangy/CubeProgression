import { Activity, Target, TrendingDown, Trophy, Zap } from 'lucide-react';
import type React from 'react';
import type { GlobalStats } from '../types';

interface MetricsOverviewCardsProps {
  stats: GlobalStats;
  sessionName: string;
}

export const MetricsOverviewCards: React.FC<MetricsOverviewCardsProps> = ({
  stats,
  sessionName: _sessionName,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Best Single */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Best Single
          </span>
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
            <Trophy className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="font-mono text-2xl font-black text-stone-100">
            {stats.bestSingle ? `${stats.bestSingle.finalTimeSec.toFixed(2)}s` : 'N/A'}
          </div>
          <p className="mt-1 truncate text-[11px] text-stone-400">
            {stats.bestSingle?.dateStr
              ? `Achieved on ${stats.bestSingle.dateStr}`
              : 'No valid solves'}
          </p>
        </div>
      </div>

      {/* 2. Best Ao12 & Best Ao50 */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Best Averages
          </span>
          <div className="rounded-xl bg-sky-500/10 p-2 text-sky-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div>
            <span className="block font-mono text-[10px] text-stone-400">Ao12</span>
            <span className="font-mono text-xl font-bold text-sky-300">
              {stats.bestAo12 ? `${stats.bestAo12.toFixed(2)}s` : '—'}
            </span>
          </div>
          <div className="border-l border-stone-800 pl-3">
            <span className="block font-mono text-[10px] text-stone-400">Ao50</span>
            <span className="font-mono text-xl font-bold text-sky-400">
              {stats.bestAo50 ? `${stats.bestAo50.toFixed(2)}s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Regression Slope */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Overall Rate
          </span>
          <div className="rounded-xl bg-rose-500/10 p-2 text-rose-400">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div
            className={`font-mono text-lg xl:text-xl font-black truncate ${
              stats.regression.slope <= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.regression.slopeFormatted}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Linear OLS trend rate</p>
        </div>
      </div>

      {/* 4. Speed Gain (First vs Last sample) */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Progression Gain
          </span>
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5 font-mono text-xl font-black text-stone-100">
            <span>
              {stats.improvementSec > 0
                ? `-${stats.improvementSec}s`
                : stats.improvementSec < 0
                  ? `+${Math.abs(stats.improvementSec)}s`
                  : '0s'}
            </span>
            <span
              className={`text-xs font-semibold ${
                stats.improvementPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({stats.improvementPct > 0 ? `+${stats.improvementPct}%` : `${stats.improvementPct}%`}
              )
            </span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            Baseline ({stats.initialAvg}s) vs Recent ({stats.recentAvg}s)
          </p>
        </div>
      </div>

      {/* 5. Session Solves Summary */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Session Solves
          </span>
          <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
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
