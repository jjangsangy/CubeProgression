import { LineChart as LineChartIcon } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
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
import { useAutoDismissTooltip } from '../hooks/useAutoDismissTooltip';
import type { GroupingPeriod, PeriodGroup } from '../types';
import { getPeriodUnitInfo } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

interface MetricsEvolutionChartProps {
  id?: string;
  periodGroups: PeriodGroup[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const MetricsEvolutionChart: React.FC<MetricsEvolutionChartProps> = ({
  id = 'metrics-evolution-chart',
  periodGroups,
  groupingPeriod = 'daily',
  title,
}) => {
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const unitInfo = getPeriodUnitInfo(groupingPeriod);
  const displayTitle = title || `${unitInfo.adjective} Speed & Consistency`;
  const { containerRef, tooltipActive, touchHandlers } = useAutoDismissTooltip();

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

  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1.5 pb-2 text-[11px] select-none sm:gap-x-4 sm:text-xs">
        <div className="flex items-center gap-1.5 text-teal-400">
          <span className="inline-block h-2.5 w-4 rounded-xs border border-teal-400/80 bg-teal-500/25" />
          <span className="recharts-legend-item-text font-medium text-teal-400">
            <span className="sm:hidden">Range</span>
            <span className="hidden sm:inline">Min-Max Range</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-400">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line x1="0" y1="5" x2="16" y2="5" stroke="#0284c7" strokeWidth="2.5" />
            <circle cx="8" cy="5" r="3" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
          </svg>
          <span className="recharts-legend-item-text font-medium text-sky-400">
            <span className="sm:hidden">Mean</span>
            <span className="hidden sm:inline">Mean Time (s)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line x1="0" y1="5" x2="16" y2="5" stroke="#f97316" strokeWidth="2.5" />
            <circle cx="8" cy="5" r="3" fill="#f97316" stroke="#ffffff" strokeWidth="1.2" />
          </svg>
          <span className="recharts-legend-item-text font-medium text-orange-400">
            <span className="sm:hidden">Median</span>
            <span className="hidden sm:inline">Median Time (s)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="16"
              y2="5"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="2.5 2"
            />
            <circle cx="8" cy="5" r="3" fill="#15803d" stroke="#4ade80" strokeWidth="1.2" />
          </svg>
          <span className="recharts-legend-item-text font-medium text-emerald-400">
            <span className="sm:hidden">Std Dev</span>
            <span className="hidden sm:inline">Std Dev / Consistency (s)</span>
          </span>
        </div>
      </div>
    );
  };

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
      <div className="max-w-[260px] rounded-xl border border-stone-700/80 bg-stone-900/95 p-2.5 text-xs text-stone-200 shadow-2xl backdrop-blur-md sm:max-w-xs sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5 font-semibold text-stone-100">
          <span className="truncate">{data.label}</span>
          <span className="shrink-0 text-[11px] font-normal text-stone-400">
            n={data.solveCount} solves
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 text-stone-400">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
              <span>Mean:</span>
            </span>
            <span className="font-mono font-semibold text-sky-300">{data.mean?.toFixed(2)}s</span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 text-stone-400">
              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
              <span>Median:</span>
            </span>
            <span className="font-mono font-semibold text-orange-300">
              {data.median?.toFixed(2)}s
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 text-stone-400">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span>Std Dev:</span>
            </span>
            <span className="font-mono font-semibold text-emerald-300">
              {data.stdDev?.toFixed(2)}s
            </span>
          </div>
          {data.min != null && data.max != null && (
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-stone-800 pt-1 text-[11px] sm:gap-4">
              <span className="flex items-center gap-1.5 text-stone-400">
                <span className="h-1.5 w-2 shrink-0 rounded-xs border border-teal-400/80 bg-teal-500/30" />
                <span>Range:</span>
              </span>
              <span className="font-mono text-teal-300">
                {data.min.toFixed(2)}s - {data.max.toFixed(2)}s
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ChartCardWrapper
      id={id}
      title={displayTitle}
      subtitle="Progression of central tendencies (Mean, Median), full Min-Max range band, and Standard Deviation on right axis."
      mobileSubtitle="Central tendencies (Mean, Median), Min-Max range band, and Standard Deviation."
      headerBadge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
          <LineChartIcon className="h-3.5 w-3.5 text-violet-400" />
          Metrics Evolution
        </span>
      }
      filenamePrefix={`${unitInfo.adjective.toLowerCase()}_metrics_evolution`}
    >
      {/* Main Chart Canvas */}
      <div
        ref={containerRef}
        className={`${isMobileScreen ? 'h-[380px]' : 'h-[400px]'} w-full pt-1`}
        {...touchHandlers}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 800, height: isMobileScreen ? 380 : 400 }}
        >
          <ComposedChart
            data={chartData}
            margin={{
              top: isMobileScreen ? 15 : 20,
              right: isMobileScreen ? 4 : 12,
              left: isMobileScreen ? 2 : 6,
              bottom: isMobileScreen ? 20 : 25,
            }}
          >
            <defs>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

            <XAxis
              dataKey="index"
              interval={Math.max(1, Math.floor(chartData.length / (isMobileScreen ? 6 : 8)))}
              stroke="#94a3b8"
              fontSize={isMobileScreen ? 10 : 11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: unitInfo.axisLabel,
                position: 'insideBottom',
                offset: isMobileScreen ? -12 : -15,
                fill: '#94a3b8',
                fontSize: isMobileScreen ? 11 : 12,
              }}
            />

            {/* Left Y Axis (Time in seconds) - full-width compact on mobile, labeled on desktop */}
            <YAxis
              yAxisId="left"
              width={isMobileScreen ? 26 : 42}
              stroke="#94a3b8"
              fontSize={isMobileScreen ? 10 : 11}
              domain={[minTime, maxTime]}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Time (s)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 4,
                      fill: '#94a3b8',
                      fontSize: 12,
                    }
              }
            />

            {/* Right Y Axis (Standard Deviation in seconds) - full-width compact on mobile, labeled on desktop */}
            <YAxis
              yAxisId="right"
              orientation="right"
              width={isMobileScreen ? 20 : 42}
              stroke="#22c55e"
              fontSize={isMobileScreen ? 10 : 11}
              domain={[0, maxStdDev]}
              tickLine={false}
              axisLine={{ stroke: '#15803d' }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Std Dev (s)',
                      angle: 90,
                      position: 'insideRight',
                      offset: 4,
                      fill: '#22c55e',
                      fontSize: 12,
                    }
              }
            />

            <Tooltip
              active={tooltipActive}
              content={<CustomTooltip />}
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              content={<CustomLegend />}
              wrapperStyle={{
                paddingBottom: '12px',
                fontSize: isMobileScreen ? '11px' : '12px',
              }}
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

      {/* Mobile-only bottom axis titles aligned with the graph edges, using graph-matching font & color */}
      {isMobileScreen && (
        <div
          id="metrics-mobile-axis-title"
          className="-mt-1.5 flex items-center justify-between px-1 text-[11px] leading-tight select-none"
        >
          <span style={{ color: '#94a3b8' }}>Time (s)</span>
          <span style={{ color: '#22c55e' }}>Std Dev (s)</span>
        </div>
      )}
    </ChartCardWrapper>
  );
};
