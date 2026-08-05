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
import { getPeriodUnitInfo, calculateAoN } from '../utils/statsMath';

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
  const [showAo5, setShowAo5] = useState(true);
  const [showAo12, setShowAo12] = useState(true);
  const [showAo50, setShowAo50] = useState(true);
  const [showAo100, setShowAo100] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showCustomAo, setShowCustomAo] = useState(false);
  const [customAoN, setCustomAoN] = useState<number>(25);

  const unitInfo = getPeriodUnitInfo(groupingPeriod);

  const chartData = useMemo(() => {
    return solves.map((solve, idx) => {
      const predY = regression.slope * solve.index + regression.intercept;
      const ao5 = solve.ao5 ?? calculateAoN(solves, idx, 5);
      const ao12 = solve.ao12 ?? calculateAoN(solves, idx, 12);
      const ao50 = solve.ao50 ?? calculateAoN(solves, idx, 50);
      const ao100 = solve.ao100 ?? calculateAoN(solves, idx, 100);
      const customAo = showCustomAo && customAoN >= 3 ? calculateAoN(solves, idx, customAoN) : null;

      return {
        index: solve.index,
        single: solve.penalty === 'DNF' ? null : solve.finalTimeSec,
        ao5,
        ao12,
        ao50,
        ao100,
        customAo,
        trend: Number(predY.toFixed(2)),
        dateStr: solve.dateStr,
        scramble: solve.scramble,
        penalty: solve.penalty,
      };
    });
  }, [solves, regression, showCustomAo, customAoN]);

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

  // Y domain with nice padding based on active visible metrics
  const yValues = useMemo(() => {
    const vals: number[] = [];
    chartData.forEach((dp) => {
      if (solveVisibility !== 'hidden' && dp.single !== null) vals.push(dp.single);
      if (showAo5 && dp.ao5 !== null) vals.push(dp.ao5);
      if (showAo12 && dp.ao12 !== null) vals.push(dp.ao12);
      if (showAo50 && dp.ao50 !== null) vals.push(dp.ao50);
      if (showAo100 && dp.ao100 !== null) vals.push(dp.ao100);
      if (showCustomAo && dp.customAo !== null) vals.push(dp.customAo);
      if (showTrend && dp.trend !== null) vals.push(dp.trend);
    });
    return vals;
  }, [chartData, solveVisibility, showAo5, showAo12, showAo50, showAo100, showCustomAo, showTrend]);

  const minY = yValues.length > 0 ? Math.max(0, Math.floor(Math.min(...yValues) - 2)) : 0;
  const maxY = yValues.length > 0 ? Math.ceil(Math.max(...yValues) + 3) : 50;

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
          {data.single !== null && solveVisibility !== 'hidden' && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-stone-400">Single Time:</span>
              <span className="font-mono font-bold text-stone-100">
                {data.penalty === 'DNF' ? 'DNF' : `${data.single?.toFixed(2)}s`}
                {data.penalty === '+2' && <span className="text-amber-400 ml-1">(+2)</span>}
              </span>
            </div>
          )}
          {showAo5 && data.ao5 !== null && data.ao5 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-emerald-400">Ao5:</span>
              <span className="font-mono font-semibold text-emerald-300">{data.ao5.toFixed(2)}s</span>
            </div>
          )}
          {showAo12 && data.ao12 !== null && data.ao12 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-orange-400">Ao12:</span>
              <span className="font-mono font-semibold text-orange-300">{data.ao12.toFixed(2)}s</span>
            </div>
          )}
          {showAo50 && data.ao50 !== null && data.ao50 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-sky-400">Ao50:</span>
              <span className="font-mono font-semibold text-sky-300">{data.ao50.toFixed(2)}s</span>
            </div>
          )}
          {showAo100 && data.ao100 !== null && data.ao100 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-purple-400">Ao100:</span>
              <span className="font-mono font-semibold text-purple-300">{data.ao100.toFixed(2)}s</span>
            </div>
          )}
          {showCustomAo && data.customAo !== null && data.customAo !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-yellow-400">Ao{customAoN}:</span>
              <span className="font-mono font-semibold text-yellow-300">{data.customAo.toFixed(2)}s</span>
            </div>
          )}
          {showTrend && (
            <div className="flex justify-between items-center gap-4 border-t border-stone-800/80 pt-1 mt-1">
              <span className="text-rose-400/90">Trend Line:</span>
              <span className="font-mono text-rose-300">{data.trend?.toFixed(2)}s</span>
            </div>
          )}
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
      subtitle="Individual solve plot with toggleable moving averages (Ao5, Ao12, Ao50, Ao100, Custom N) and OLS linear regression trend."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>}
      filenamePrefix="progression_moving_averages"
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Controls to toggle average metrics */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs flex-wrap">
            <span className="text-stone-400 text-[11px] px-1 font-medium">Averages:</span>
            <button
              type="button"
              onClick={() => setShowAo5(!showAo5)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo5
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao5
            </button>
            <button
              type="button"
              onClick={() => setShowAo12(!showAo12)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo12
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao12
            </button>
            <button
              type="button"
              onClick={() => setShowAo50(!showAo50)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo50
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao50
            </button>
            <button
              type="button"
              onClick={() => setShowAo100(!showAo100)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo100
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao100
            </button>
            <button
              type="button"
              onClick={() => setShowTrend(!showTrend)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showTrend
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Trend
            </button>
            
            {/* Custom AoN toggle and input */}
            <div className="inline-flex items-center gap-1 border-l border-stone-700/80 pl-1.5 ml-0.5">
              <button
                type="button"
                onClick={() => setShowCustomAo(!showCustomAo)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  showCustomAo
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 border border-transparent'
                }`}
              >
                Custom Ao
              </button>
              {showCustomAo && (
                <div className="flex items-center gap-1 bg-stone-900 px-1.5 py-0.5 rounded border border-yellow-500/30">
                  <span className="text-[10px] text-stone-400 font-mono">Ao</span>
                  <input
                    type="number"
                    min="3"
                    max="1000"
                    value={customAoN}
                    onChange={(e) => setCustomAoN(Math.max(3, parseInt(e.target.value) || 3))}
                    className="w-10 bg-transparent text-xs font-mono font-bold text-yellow-200 focus:outline-none border-b border-stone-600 focus:border-yellow-400 text-center"
                  />
                </div>
              )}
            </div>
          </div>

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

            {/* 1. Single Solve Time */}
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

            {/* 2. 5-Solve Moving Average (Ao5) */}
            {showAo5 && (
              <Line
                type="monotone"
                dataKey="ao5"
                name="5-Solve Moving Average (Ao5)"
                stroke="#22c55e"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4.5, fill: '#22c55e' }}
              />
            )}

            {/* 3. 12-Solve Moving Average (Ao12) */}
            {showAo12 && (
              <Line
                type="monotone"
                dataKey="ao12"
                name="12-Solve Moving Average (Ao12)"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#f97316' }}
              />
            )}

            {/* 4. 50-Solve Moving Average (Ao50) */}
            {showAo50 && (
              <Line
                type="monotone"
                dataKey="ao50"
                name="50-Solve Moving Average (Ao50)"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5.5, fill: '#0284c7' }}
              />
            )}

            {/* 5. 100-Solve Moving Average (Ao100) */}
            {showAo100 && (
              <Line
                type="monotone"
                dataKey="ao100"
                name="100-Solve Moving Average (Ao100)"
                stroke="#a855f7"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#a855f7' }}
              />
            )}

            {/* 6. Custom Ao N Moving Average */}
            {showCustomAo && customAoN >= 3 && (
              <Line
                type="monotone"
                dataKey="customAo"
                name={`${customAoN}-Solve Moving Average (Ao${customAoN})`}
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#eab308' }}
              />
            )}

            {/* 7. Overall Trend Line */}
            {showTrend && (
              <Line
                type="linear"
                dataKey="trend"
                name={`Overall Trend (${regression.slopeFormatted})`}
                stroke="#e11d48"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCardWrapper>
  );
};

