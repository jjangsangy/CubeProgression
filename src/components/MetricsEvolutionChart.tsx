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
import { useTheme } from '../theme';
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
  const { colors } = useTheme();
  const unitInfo = getPeriodUnitInfo(groupingPeriod);
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
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-xs border"
            style={{
              borderColor: colors.series.teal,
              backgroundColor: `${colors.series.teal}40`,
            }}
          />
          <span
            className="recharts-legend-item-text font-medium"
            style={{ color: colors.textSecondary }}
          >
            <span className="sm:hidden">Range</span>
            <span className="hidden sm:inline">Min-Max Range</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line x1="0" y1="5" x2="16" y2="5" stroke={colors.series.blue} strokeWidth="2.5" />
            <circle
              cx="8"
              cy="5"
              r="3"
              fill={colors.series.blue}
              stroke={colors.bgCard}
              strokeWidth="1.2"
            />
          </svg>
          <span
            className="recharts-legend-item-text font-medium"
            style={{ color: colors.series.blue }}
          >
            <span className="sm:hidden">Mean</span>
            <span className="hidden sm:inline">Mean Time (s)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line x1="0" y1="5" x2="16" y2="5" stroke={colors.series.orange} strokeWidth="2.5" />
            <circle
              cx="8"
              cy="5"
              r="3"
              fill={colors.series.orange}
              stroke={colors.bgCard}
              strokeWidth="1.2"
            />
          </svg>
          <span
            className="recharts-legend-item-text font-medium"
            style={{ color: colors.series.orange }}
          >
            <span className="sm:hidden">Median</span>
            <span className="hidden sm:inline">Median Time (s)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-4" viewBox="0 0 16 10" aria-hidden="true">
            <line
              x1="0"
              y1="5"
              x2="16"
              y2="5"
              stroke={colors.series.green}
              strokeWidth="2"
              strokeDasharray="2.5 2"
            />
            <circle
              cx="8"
              cy="5"
              r="3"
              fill={colors.series.green}
              stroke={colors.series.green}
              strokeWidth="1.2"
            />
          </svg>
          <span
            className="recharts-legend-item-text font-medium"
            style={{ color: colors.series.green }}
          >
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
      <div
        className="max-w-[260px] rounded-xl border p-2.5 text-xs shadow-2xl backdrop-blur-md sm:max-w-xs sm:p-3"
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
          <span className="truncate">{data.label}</span>
          <span className="shrink-0 text-[11px] font-normal" style={{ color: colors.textMuted }}>
            n={data.solveCount} solves
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.series.blue }}
              />
              <span>Mean:</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: colors.series.blue }}>
              {data.mean?.toFixed(2)}s
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.series.orange }}
              />
              <span>Median:</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: colors.series.orange }}>
              {data.median?.toFixed(2)}s
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colors.series.green }}
              />
              <span>Std Dev:</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: colors.series.green }}>
              {data.stdDev?.toFixed(2)}s
            </span>
          </div>
          {data.min != null && data.max != null && (
            <div
              className="mt-1 flex items-center justify-between gap-2 border-t pt-1 text-[11px] sm:gap-4"
              style={{ borderColor: colors.borderSubtle }}
            >
              <span className="flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                <span
                  className="h-1.5 w-2 shrink-0 rounded-xs border"
                  style={{
                    borderColor: colors.series.teal,
                    backgroundColor: `${colors.series.teal}40`,
                  }}
                />
                <span>Range:</span>
              </span>
              <span className="font-mono" style={{ color: colors.textPrimary }}>
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
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={{
            borderColor: `${colors.accent}40`,
            backgroundColor: `${colors.accent}18`,
            color: colors.accentText,
          }}
        >
          <LineChartIcon className="h-3.5 w-3.5" style={{ color: colors.accent }} />
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
                <stop offset="5%" stopColor={colors.series.teal} stopOpacity={0.25} />
                <stop offset="95%" stopColor={colors.series.teal} stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.borderSubtle}
              opacity={0.4}
              vertical={false}
            />

            <XAxis
              dataKey="index"
              interval={Math.max(1, Math.floor(chartData.length / (isMobileScreen ? 6 : 8)))}
              stroke={colors.textMuted}
              fontSize={isMobileScreen ? 10 : 11}
              tickLine={false}
              axisLine={{ stroke: colors.borderSubtle }}
              label={{
                value: unitInfo.axisLabel,
                position: 'insideBottom',
                offset: isMobileScreen ? -12 : -15,
                fill: colors.textMuted,
                fontSize: isMobileScreen ? 11 : 12,
              }}
            />

            {/* Left Y Axis (Time in seconds) - full-width compact on mobile, labeled on desktop */}
            <YAxis
              yAxisId="left"
              width={isMobileScreen ? 26 : 42}
              stroke={colors.textMuted}
              fontSize={isMobileScreen ? 10 : 11}
              domain={[minTime, maxTime]}
              tickLine={false}
              axisLine={{ stroke: colors.borderSubtle }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Time (s)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 4,
                      fill: colors.textMuted,
                      fontSize: 12,
                    }
              }
            />

            {/* Right Y Axis (Standard Deviation in seconds) - full-width compact on mobile, labeled on desktop */}
            <YAxis
              yAxisId="right"
              orientation="right"
              width={isMobileScreen ? 20 : 42}
              stroke={colors.series.green}
              fontSize={isMobileScreen ? 10 : 11}
              domain={[0, maxStdDev]}
              tickLine={false}
              axisLine={{ stroke: colors.series.green }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Std Dev (s)',
                      angle: 90,
                      position: 'insideRight',
                      offset: 4,
                      fill: colors.series.green,
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

            {/* Mean Time */}
            <Line
              isAnimationActive={false}
              yAxisId="left"
              type="monotone"
              dataKey="mean"
              name="Mean Time (s)"
              stroke={colors.series.blue}
              strokeWidth={3}
              dot={{
                r: 4.5,
                fill: colors.series.blue,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 7,
                fill: colors.series.blue,
                stroke: colors.bgCard,
                strokeWidth: 2,
              }}
            />

            {/* Median Time */}
            <Line
              isAnimationActive={false}
              yAxisId="left"
              type="monotone"
              dataKey="median"
              name="Median Time (s)"
              stroke={colors.series.orange}
              strokeWidth={3}
              dot={{
                r: 4.5,
                fill: colors.series.orange,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 7,
                fill: colors.series.orange,
                stroke: colors.bgCard,
                strokeWidth: 2,
              }}
            />

            {/* Standard Deviation */}
            <Line
              isAnimationActive={false}
              yAxisId="right"
              type="monotone"
              dataKey="stdDev"
              name="Std Dev / Consistency (s)"
              stroke={colors.series.green}
              strokeWidth={2.2}
              strokeDasharray="3 3"
              dot={{
                r: 4.5,
                fill: colors.series.green,
                stroke: colors.series.green,
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 7,
                fill: colors.series.green,
                stroke: colors.bgCard,
                strokeWidth: 2,
              }}
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
          <span style={{ color: colors.textMuted }}>Time (s)</span>
          <span style={{ color: colors.series.green }}>Std Dev (s)</span>
        </div>
      )}
    </ChartCardWrapper>
  );
};
