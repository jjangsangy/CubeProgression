import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PeriodGroup, GroupingPeriod } from '../types';
import { ChartCardWrapper } from './ChartCardWrapper';
import { getPeriodUnitInfo } from '../utils/statsMath';

interface MetricsEvolutionChartProps {
  periodGroups: PeriodGroup[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const MetricsEvolutionChart: React.FC<MetricsEvolutionChartProps> = ({
  periodGroups,
  groupingPeriod = 'daily',
  title,
}) => {
  const unitInfo = getPeriodUnitInfo(groupingPeriod);
  const displayTitle = title || `${unitInfo.adjective} Metrics Evolution: Speed & Consistency`;

  const chartData = useMemo(() => {
    return periodGroups.map((g, idx) => ({
      index: idx + 1,
      label: g.label,
      mean: g.mean,
      median: g.median,
      min: g.min,
      max: g.max,
      range: [g.min, g.max], // For range band
      stdDev: g.stdDev,
      solveCount: g.solves.length,
    }));
  }, [periodGroups]);

  // Determine Y ranges
  const minTime = useMemo(() => {
    if (periodGroups.length === 0) return 10;
    return Math.max(0, Math.floor(Math.min(...periodGroups.map((g) => g.min)) - 2));
  }, [periodGroups]);

  const maxTime = useMemo(() => {
    if (periodGroups.length === 0) return 45;
    return Math.ceil(Math.max(...periodGroups.map((g) => g.max)) + 3);
  }, [periodGroups]);

  const maxStdDev = useMemo(() => {
    if (periodGroups.length === 0) return 10;
    return Math.ceil(Math.max(...periodGroups.map((g) => g.stdDev)) + 2);
  }, [periodGroups]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-stone-900/95 border border-stone-700/80 rounded-xl p-3 shadow-2xl text-xs text-stone-200 backdrop-blur-md">
        <div className="font-semibold text-stone-100 border-b border-stone-800 pb-1 mb-2 flex justify-between gap-4">
          <span>{data.label}</span>
          <span className="text-stone-400 font-normal">n={data.solveCount} solves</span>
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between gap-4 text-sky-400">
            <span>Mean Time:</span>
            <span className="font-bold">{data.mean?.toFixed(2)}s</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-orange-400">
            <span>Median Time:</span>
            <span className="font-bold">{data.median?.toFixed(2)}s</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Std Dev (Consistency):</span>
            <span className="font-bold">{data.stdDev?.toFixed(2)}s</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-stone-400 border-t border-stone-800 pt-1 mt-1">
            <span>Min - Max Range:</span>
            <span>
              {data.min?.toFixed(2)}s - {data.max?.toFixed(2)}s
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ChartCardWrapper
      title={displayTitle}
      subtitle="Progression of central tendencies (Mean, Median), full Min-Max range band, and Standard Deviation on right axis."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>}
      filenamePrefix={`${unitInfo.adjective.toLowerCase()}_metrics_evolution`}
    >
      {/* Main Chart Canvas */}
      <div className="w-full h-[400px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 10, bottom: 25 }}>
            <defs>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

            <XAxis
              dataKey="index"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: unitInfo.axisLabel,
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />

            {/* Left Y Axis (Time in seconds) */}
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={11}
              domain={[minTime, maxTime]}
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

            {/* Right Y Axis (Standard Deviation in seconds) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#22c55e"
              fontSize={11}
              domain={[0, maxStdDev]}
              tickLine={false}
              axisLine={{ stroke: '#15803d' }}
              label={{
                value: 'Standard Deviation (s)',
                angle: 90,
                position: 'insideRight',
                offset: 5,
                fill: '#22c55e',
                fontSize: 12,
              }}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '15px', fontSize: '12px' }}
            />

            {/* Shaded Area for Min-Max Range */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="range"
              name="Min-Max Range"
              stroke="none"
              fill="url(#colorRange)"
            />

            {/* Mean Time (Blue line with circular dots) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="mean"
              name="Mean Time (s)"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{ r: 4.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 7 }}
            />

            {/* Median Time (Orange line with square markers) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="median"
              name="Median Time (s)"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4.5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 7 }}
            />

            {/* Standard Deviation (Green dotted line on right axis) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="stdDev"
              name="Std Dev / Consistency (s)"
              stroke="#22c55e"
              strokeWidth={2.2}
              strokeDasharray="3 3"
              dot={{ r: 4.5, fill: '#15803d', stroke: '#4ade80', strokeWidth: 1.5 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCardWrapper>
  );
};
