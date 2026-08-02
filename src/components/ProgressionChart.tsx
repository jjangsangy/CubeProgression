import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Solve, PeriodGroup, LinearRegression, GroupingPeriod } from '../types';
import { ChartCardWrapper } from './ChartCardWrapper';
import { getPeriodUnitInfo } from '../utils/statsMath';

interface ProgressionChartProps {
  solves: Solve[];
  periodGroups: PeriodGroup[];
  regression: LinearRegression;
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export type SolveVisibilityMode = 'muted' | 'unmuted' | 'dots' | 'hidden' | 'visible';

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  solves,
  periodGroups,
  regression,
  groupingPeriod = 'daily',
  title = 'Overall Progression & Moving Averages',
}) => {
  const [solveVisibility, setSolveVisibility] = useState<SolveVisibilityMode>('muted');
  const unitInfo = getPeriodUnitInfo(groupingPeriod);

  const chartData = useMemo(() => {
    return solves.map((solve) => {
      const predY = regression.slope * solve.index + regression.intercept;
      return {
        index: solve.index,
        single: solve.penalty === 'DNF' ? null : solve.finalTimeSec,
        ao12: solve.ao12,
        ao50: solve.ao50,
        trend: Number(predY.toFixed(2)),
        dateStr: solve.dateStr,
        scramble: solve.scramble,
        penalty: solve.penalty,
      };
    });
  }, [solves, regression]);

  // Find period boundary solve indices for vertical reference lines
  const periodBoundaries = useMemo(() => {
    let acc = 0;
    return periodGroups.map((group, idx) => {
      const count = group.solves.length;
      acc += count;
      return {
        index: acc,
        label: `${unitInfo.unitSingular} ${idx + 1}`,
        groupLabel: group.label,
        midIndex: Math.round(acc - count / 2),
      };
    });
  }, [periodGroups, unitInfo]);

  // Y domain with nice padding
  const validTimes = solves.filter((s) => s.penalty !== 'DNF').map((s) => s.finalTimeSec);
  const minY = validTimes.length > 0 ? Math.max(0, Math.floor(Math.min(...validTimes) - 2)) : 0;
  const maxY = validTimes.length > 0 ? Math.ceil(Math.max(...validTimes) + 3) : 50;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-stone-900/95 border border-stone-700/80 rounded-xl p-3 shadow-2xl text-xs text-stone-200 backdrop-blur-md max-w-xs">
        <div className="font-semibold text-stone-100 border-b border-stone-800 pb-1.5 mb-2 flex justify-between items-center">
          <span>Solve #{label}</span>
          <span className="text-stone-400 font-normal">{data.dateStr}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4">
            <span className="text-stone-400">Single Time:</span>
            <span className="font-mono font-bold text-stone-100">
              {data.penalty === 'DNF' ? 'DNF' : `${data.single?.toFixed(2)}s`}
              {data.penalty === '+2' && <span className="text-amber-400 ml-1">(+2)</span>}
            </span>
          </div>
          {data.ao12 !== null && data.ao12 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-orange-400">Ao12:</span>
              <span className="font-mono font-semibold text-orange-300">{data.ao12.toFixed(2)}s</span>
            </div>
          )}
          {data.ao50 !== null && data.ao50 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-sky-400">Ao50:</span>
              <span className="font-mono font-semibold text-sky-300">{data.ao50.toFixed(2)}s</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-4 border-t border-stone-800/80 pt-1 mt-1">
            <span className="text-rose-400/90">Trend Line:</span>
            <span className="font-mono text-rose-300">{data.trend?.toFixed(2)}s</span>
          </div>
        </div>
        {data.scramble && (
          <div className="mt-2.5 pt-2 border-t border-stone-800 text-[10px] text-stone-400 font-mono truncate">
            Scramble: {data.scramble}
          </div>
        )}
      </div>
    );
  };

  // Configure single solves line styling based on solveVisibility mode
  const singleLineStyle = useMemo(() => {
    switch (solveVisibility) {
      case 'hidden':
        return {
          stroke: 'transparent',
          strokeWidth: 0,
          strokeOpacity: 0,
          dot: false,
        };
      case 'unmuted':
      case 'visible':
        return {
          stroke: '#94a3b8',
          strokeWidth: 1,
          strokeOpacity: 0.6,
          dot: { r: 2.5, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 0.5 },
        };
      case 'dots':
        return {
          stroke: '#64748b',
          strokeWidth: 0.75,
          strokeOpacity: 0.25,
          dot: { r: 1.2, fill: '#94a3b8', fillOpacity: 0.35, stroke: 'none' },
        };
      case 'muted':
      default:
        return {
          stroke: '#64748b',
          strokeWidth: 0.75,
          strokeOpacity: 0.2,
          dot: false,
        };
    }
  }, [solveVisibility]);

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Individual solve plot, 12-solve moving average (Ao12), 50-solve moving average (Ao50), and OLS overall regression trend."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>}
      filenamePrefix="progression_moving_averages"
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Controls to toggle single solve visibility */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs">
            <span className="text-stone-400 text-[11px] px-1.5 font-medium">Solves:</span>
            <button
              type="button"
              onClick={() => setSolveVisibility('muted')}
              title="Show subtle line without cluttering dots (default clean view)"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                solveVisibility === 'muted'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Muted
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('unmuted')}
              title="Show original white line and dots"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                solveVisibility === 'unmuted' || solveVisibility === 'visible'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Unmuted
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('dots')}
              title="Show subtle line with small dots"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                solveVisibility === 'dots'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              With Dots
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('hidden')}
              title="Hide single solve line entirely"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                solveVisibility === 'hidden'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hidden
            </button>
          </div>

          {/* Regression Metrics */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/70 border border-stone-700/50 text-xs font-mono text-stone-300">
            <span>Slope:</span>
            <span className={regression.slope <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {regression.slopeFormatted}
            </span>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">R² = {(regression.r2 * 100).toFixed(1)}%</span>
          </div>
        </div>
      }
    >
      <div className="w-full h-[420px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="index"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: `Solve Number (${periodGroups.length > 0 ? `~${Math.round(solves.length / periodGroups.length)} ${unitInfo.solvesPerUnit}` : ''})`,
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              domain={[minY, maxY]}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: 'Time (seconds)',
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
              wrapperStyle={{ paddingBottom: '15px', fontSize: '12px' }}
            />

            {/* Vertical Period Boundaries */}
            {periodBoundaries.map((b, idx) => (
              <ReferenceLine
                key={idx}
                x={b.index}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth={1.2}
                label={{
                  value: b.label,
                  position: 'top',
                  fill: '#cbd5e1',
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 8,
                }}
              />
            ))}

            {/* 1. Single Solve Time (Muted by default to eliminate visual clutter) */}
            {solveVisibility !== 'hidden' && (
              <Line
                type="linear"
                dataKey="single"
                name="Single Solve Time"
                stroke={singleLineStyle.stroke}
                strokeWidth={singleLineStyle.strokeWidth}
                strokeOpacity={singleLineStyle.strokeOpacity}
                dot={singleLineStyle.dot}
                activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 1.5 }}
                connectNulls={false}
              />
            )}

            {/* 2. 12-Solve Moving Average (Ao12) */}
            <Line
              type="monotone"
              dataKey="ao12"
              name="12-Solve Moving Average (Ao12)"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#f97316' }}
            />

            {/* 3. 50-Solve Moving Average (Ao50) */}
            <Line
              type="monotone"
              dataKey="ao50"
              name="50-Solve Moving Average (Ao50)"
              stroke="#0284c7"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#38bdf8' }}
            />

            {/* 4. Overall Trend Line */}
            <Line
              type="linear"
              dataKey="trend"
              name={`Overall Trend (${regression.slopeFormatted})`}
              stroke="#e11d48"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCardWrapper>
  );
};

