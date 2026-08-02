import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Solve, GroupingPeriod } from '../types';
import { calculateKDE } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

interface DensityShiftChartProps {
  solves: Solve[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const DensityShiftChart: React.FC<DensityShiftChartProps> = ({
  solves,
  groupingPeriod,
  title = 'Distribution Density Shift',
}) => {
  const [splitPercent, setSplitPercent] = useState<number>(0.3); // 30% default baseline/recent split

  const kdeData = useMemo(() => {
    return calculateKDE(solves, splitPercent, splitPercent, 120);
  }, [solves, splitPercent]);

  // Compute peak density and mean times for annotations
  const statsSummary = useMemo(() => {
    const valid = solves.filter((s) => s.penalty !== 'DNF');
    if (valid.length < 10) return null;

    const n = Math.floor(valid.length * splitPercent);
    const baselineSolves = valid.slice(0, n).map((s) => s.finalTimeSec);
    const recentSolves = valid.slice(valid.length - n).map((s) => s.finalTimeSec);

    const bMean = baselineSolves.reduce((a, b) => a + b, 0) / baselineSolves.length;
    const rMean = recentSolves.reduce((a, b) => a + b, 0) / recentSolves.length;

    return {
      baselineCount: baselineSolves.length,
      recentCount: recentSolves.length,
      baselineMean: bMean.toFixed(2),
      recentMean: rMean.toFixed(2),
      diff: (bMean - rMean).toFixed(2),
    };
  }, [solves, splitPercent]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-stone-900/95 border border-stone-700 rounded-xl p-3 shadow-2xl text-xs text-stone-200 backdrop-blur-md">
        <div className="font-mono font-bold text-stone-100 border-b border-stone-800 pb-1 mb-2">
          Solve Time: {label}s
        </div>
        <div className="space-y-1 font-mono">
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Baseline Density:</span>
            <span>{payload[0]?.value?.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Recent Density:</span>
            <span>{payload[1]?.value?.toFixed(4)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Kernel Density Estimation (KDE) comparison showing probability density shift from early to recent solves."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>}
      filenamePrefix="density_shift_distribution"
      headerControls={
        <div className="flex items-center gap-3 bg-stone-800/60 border border-stone-700/50 rounded-xl px-3 py-1.5 text-xs">
          <span className="text-stone-400 font-medium">Split Sample:</span>
          {[0.2, 0.3, 0.4].map((pct) => (
            <button
              key={pct}
              onClick={() => setSplitPercent(pct)}
              className={`px-2 py-0.5 rounded transition-all text-xs font-semibold cursor-pointer ${
                splitPercent === pct
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
              }`}
            >
              {pct * 100}%
            </button>
          ))}
        </div>
      }
    >
      {/* Mean shift banner */}
      {statsSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950/60 border border-stone-800/70 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400"></span>
            <span className="text-stone-400">Baseline Mean:</span>
            <span className="font-mono font-bold text-rose-300">{statsSummary.baselineMean}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400"></span>
            <span className="text-stone-400">Recent Mean:</span>
            <span className="font-mono font-bold text-emerald-300">{statsSummary.recentMean}s</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-stone-400">Distribution Shift:</span>
            <span className="font-mono font-bold text-amber-400">-{statsSummary.diff}s faster</span>
          </div>
        </div>
      )}

      {/* Main Area Chart */}
      <div className="w-full h-[360px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={kdeData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorRecent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="x"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: 'Solve Time (seconds)',
                position: 'insideBottom',
                offset: -12,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: 'Density',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />

            {/* Baseline Density Area (Red) */}
            <Area
              type="monotone"
              dataKey="baselineDensity"
              name={`Baseline Solves (First ${splitPercent * 100}%)`}
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBaseline)"
            />

            {/* Recent Density Area (Green) */}
            <Area
              type="monotone"
              dataKey="recentDensity"
              name={`Recent Solves (Last ${splitPercent * 100}%)`}
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRecent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCardWrapper>
  );
};
