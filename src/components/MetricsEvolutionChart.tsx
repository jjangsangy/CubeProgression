import type React from 'react';
import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GroupingPeriod, PeriodGroup } from '../types';
import { getPeriodUnitInfo } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

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

  const chartData = useMemo(
    () =>
      periodGroups.map((g, idx) => ({
        index: idx + 1,
        label: g.label,
        mean: g.mean,
        median: g.median,
        min: g.min,
        max: g.max,
        range: [g.min, g.max], // For range band
        stdDev: g.stdDev,
        solveCount: g.solves.length,
      })),
    [periodGroups],
  );

  // Determine Y ranges
  const { minTime, maxTime, maxStdDev } = useMemo(() => {
    const min =
      periodGroups.length === 0
        ? 10
        : Math.max(0, Math.floor(Math.min(...periodGroups.map((g) => g.min)) - 2));

    const max =
      periodGroups.length === 0 ? 45 : Math.ceil(Math.max(...periodGroups.map((g) => g.max)) + 3);

    const maxSd =
      periodGroups.length === 0
        ? 10
        : Math.ceil(Math.max(...periodGroups.map((g) => g.stdDev)) + 2);

    return { minTime: min, maxTime: max, maxStdDev: maxSd };
  }, [periodGroups]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        label: string;
        solveCount: number;
        mean?: number;
        median?: number;
        stdDev?: number;
        iqr?: number;
        min?: number;
        max?: number;
      };
    }>;
  }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    return (
      <div className="rounded-xl border border-stone-700/80 bg-stone-900/95 p-3 text-xs text-stone-200 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex justify-between gap-4 border-b border-stone-800 pb-1 font-semibold text-stone-100">
          <span>{data.label}</span>
          <span className="font-normal text-stone-400">n={data.solveCount} solves</span>
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
          <div className="mt-1 flex items-center justify-between gap-4 border-t border-stone-800 pt-1 text-stone-400">
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
      headerBadge={<span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400"></span>}
      filenamePrefix={`${unitInfo.adjective.toLowerCase()}_metrics_evolution`}
    >
      {/* Main Chart Canvas */}
      <div className="h-[400px] w-full pt-2">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 800, height: 400 }}
        >
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
              interval={Math.max(1, Math.floor(chartData.length / 8))}
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
              isAnimationActive={false}
              yAxisId="left"
              type="monotone"
              dataKey="range"
              name="Min-Max Range"
              stroke="none"
              fill="url(#colorRange)"
            />

            {/* Mean Time (Blue line with circular dots) */}
            <Line
              isAnimationActive={false}
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
              isAnimationActive={false}
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
              isAnimationActive={false}
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
