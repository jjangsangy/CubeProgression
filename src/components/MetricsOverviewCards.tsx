import React from 'react';
import { Trophy, TrendingDown, Zap, Target, Activity } from 'lucide-react';
import { GlobalStats } from '../types';

interface MetricsOverviewCardsProps {
  stats: GlobalStats;
  sessionName: string;
}

export const MetricsOverviewCards: React.FC<MetricsOverviewCardsProps> = ({ stats, sessionName }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Best Single */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Best Single</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-stone-100">
            {stats.bestSingle ? `${stats.bestSingle.finalTimeSec.toFixed(2)}s` : 'N/A'}
          </div>
          <p className="text-[11px] text-stone-400 mt-1 truncate">
            {stats.bestSingle?.dateStr ? `Achieved on ${stats.bestSingle.dateStr}` : 'No valid solves'}
          </p>
        </div>
      </div>

      {/* 2. Best Ao12 & Best Ao50 */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Best Averages</span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div>
            <span className="text-[10px] text-stone-400 block font-mono">Ao12</span>
            <span className="text-xl font-bold font-mono text-sky-300">
              {stats.bestAo12 ? `${stats.bestAo12.toFixed(2)}s` : '—'}
            </span>
          </div>
          <div className="border-l border-stone-800 pl-3">
            <span className="text-[10px] text-stone-400 block font-mono">Ao50</span>
            <span className="text-xl font-bold font-mono text-sky-400">
              {stats.bestAo50 ? `${stats.bestAo50.toFixed(2)}s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Regression Slope */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Overall Rate</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black font-mono text-emerald-400">
            {stats.regression.slopeFormatted}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Linear OLS trend rate
          </p>
        </div>
      </div>

      {/* 4. Speed Gain (First vs Last sample) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Progression Gain</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black font-mono text-stone-100 flex items-baseline gap-1.5">
            <span>{stats.improvementSec > 0 ? `-${stats.improvementSec}s` : `${stats.improvementSec}s`}</span>
            <span className="text-xs font-semibold text-emerald-400">
              ({stats.improvementPct > 0 ? `+${stats.improvementPct}%` : `${stats.improvementPct}%`})
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Baseline ({stats.initialAvg}s) vs Recent ({stats.recentAvg}s)
          </p>
        </div>
      </div>

      {/* 5. Session Solves Summary */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Session Solves</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black font-mono text-stone-100">
            {stats.totalSolves} <span className="text-xs font-normal text-stone-400">solves</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {stats.dnfCount > 0 ? `${stats.dnfCount} DNFs` : '0 DNFs'} &bull; Mean {stats.overallMean}s
          </p>
        </div>
      </div>
    </div>
  );
};
