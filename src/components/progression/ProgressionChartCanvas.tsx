import type React from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAutoDismissTooltip } from '../../hooks/useAutoDismissTooltip';
import { useTheme } from '../../theme';
import { ProgressionCustomTooltip } from './ProgressionCustomTooltip';
import type {
  ProgressionDataPoint,
  ResponsiveBoundaryInfo,
  SingleLineStyle,
  SolveVisibilityMode,
} from './types';

export interface ProgressionChartCanvasProps {
  chartData: ProgressionDataPoint[];
  minY: number;
  maxY: number;
  isMobileScreen: boolean;
  responsiveBoundaryInfo: ResponsiveBoundaryInfo;
  singleLineStyle: SingleLineStyle;
  solveVisibility: SolveVisibilityMode;
  showAo5: boolean;
  showAo12: boolean;
  showAo50: boolean;
  showAo100: boolean;
  showCustomAo: boolean;
  customAoN: number;
  showTrend: boolean;
  slopeFormatted: string;
}

interface ProgressionCustomLegendContentProps {
  payload?: Array<{ value: string; color: string; dataKey?: string }>;
  isMobileScreen?: boolean;
}

const ProgressionCustomLegendContent: React.FC<ProgressionCustomLegendContentProps> = ({
  payload,
  isMobileScreen,
}) => {
  const { colors } = useTheme();
  return (
    <div className="w-full select-none">
      {/* Mobile-only bottom axis title positioned directly below chart axes and above legend keys */}
      {isMobileScreen && (
        <div
          id="progression-mobile-axis-title"
          className="mb-2 flex items-center justify-between px-1 text-[11px] leading-tight"
        >
          <span style={{ color: colors.textMuted }}>Time (s)</span>
        </div>
      )}

      {/* Legend series items */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-1.5 pt-0.5 text-[10px] sm:text-xs">
        {payload?.map((entry) => (
          <div
            key={`legend-${entry.dataKey || entry.value}`}
            className="flex items-center gap-1 sm:gap-1.5"
          >
            <svg className="h-2.5 w-3.5" viewBox="0 0 16 10" aria-hidden="true">
              <line
                x1="0"
                y1="5"
                x2="16"
                y2="5"
                stroke={entry.color}
                strokeWidth={entry.dataKey === 'trend' ? 2 : 2.5}
                strokeDasharray={entry.dataKey === 'trend' ? '4 3' : undefined}
              />
              {entry.dataKey !== 'trend' && (
                <circle
                  cx="8"
                  cy="5"
                  r="2.5"
                  fill={entry.color}
                  stroke={colors.bgCard}
                  strokeWidth="1"
                />
              )}
            </svg>
            <span
              className="recharts-legend-item-text font-medium"
              style={{ color: colors.textSecondary }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProgressionChartCanvas: React.FC<ProgressionChartCanvasProps> = ({
  chartData,
  minY,
  maxY,
  isMobileScreen,
  responsiveBoundaryInfo,
  singleLineStyle,
  solveVisibility,
  showAo5,
  showAo12,
  showAo50,
  showAo100,
  showCustomAo,
  customAoN,
  showTrend,
  slopeFormatted,
}) => {
  const { colors } = useTheme();
  const xInterval = Math.max(1, Math.floor(chartData.length / (isMobileScreen ? 6 : 12)));
  const { containerRef, tooltipActive, touchHandlers } = useAutoDismissTooltip();

  return (
    <div
      ref={containerRef}
      id="progression-chart-canvas"
      className="h-[420px] w-full pt-1"
      {...touchHandlers}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 800, height: 420 }}
      >
        <ComposedChart
          data={chartData}
          margin={{
            top: 65,
            right: isMobileScreen ? 4 : 30,
            left: isMobileScreen ? 2 : 10,
            bottom: isMobileScreen ? 12 : 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} vertical={false} />
          <XAxis
            dataKey="index"
            interval={xInterval}
            stroke={colors.textMuted}
            fontSize={isMobileScreen ? 10 : 11}
            tickLine={false}
            axisLine={{ stroke: colors.borderSubtle }}
          />
          <YAxis
            width={isMobileScreen ? 26 : 42}
            stroke={colors.textMuted}
            fontSize={isMobileScreen ? 10 : 11}
            domain={[minY, maxY]}
            tickLine={false}
            axisLine={{ stroke: colors.borderSubtle }}
            label={
              isMobileScreen
                ? undefined
                : {
                    value: 'Time (seconds)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 5,
                    fill: colors.textMuted,
                    fontSize: 12,
                  }
            }
          />
          <Tooltip
            active={tooltipActive}
            cursor={{ stroke: colors.borderSubtle, strokeDasharray: '4 4' }}
            content={
              <ProgressionCustomTooltip
                solveVisibility={solveVisibility}
                showAo5={showAo5}
                showAo12={showAo12}
                showAo50={showAo50}
                showAo100={showAo100}
                showCustomAo={showCustomAo}
                customAoN={customAoN}
                showTrend={showTrend}
              />
            }
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ pointerEvents: 'none', zIndex: 50 }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            content={<ProgressionCustomLegendContent isMobileScreen={isMobileScreen} />}
            wrapperStyle={{
              paddingTop: '6px',
            }}
          />

          {/* Vertical Period Boundaries (Responsive Ticks rendered vertically) */}
          {responsiveBoundaryInfo.boundaries.map((b) => (
            <ReferenceLine
              key={`period-boundary-${b.periodNumber}-${b.index}`}
              x={b.index}
              stroke={colors.textMuted}
              strokeDasharray="3 3"
              strokeWidth={1.2}
              label={(props: { viewBox?: { x?: number; y?: number } }) => {
                const { viewBox } = props || {};
                if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number')
                  return null;
                const { x, y } = viewBox;
                const tx = x + 4;
                const ty = y - 8;
                return (
                  <text
                    x={tx}
                    y={ty}
                    fill={colors.textSecondary}
                    fontSize={10}
                    fontWeight={600}
                    textAnchor="start"
                    transform={`rotate(-90, ${tx}, ${ty})`}
                  >
                    {b.label}
                  </text>
                );
              }}
            />
          ))}

          {/* 1. Single Solve Time */}
          {solveVisibility !== 'hidden' && (
            <Line
              isAnimationActive={false}
              type="linear"
              dataKey="single"
              name="Single"
              stroke={singleLineStyle.stroke}
              strokeWidth={singleLineStyle.strokeWidth}
              strokeOpacity={singleLineStyle.strokeOpacity}
              dot={singleLineStyle.dot}
              activeDot={{
                r: 5,
                fill: colors.accent,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
              connectNulls={false}
            />
          )}

          {/* 2. 5-Solve Moving Average (Ao5) */}
          {showAo5 && (
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="ao5"
              name="Ao5"
              stroke={colors.series.green}
              strokeWidth={1.5}
              dot={false}
              activeDot={{
                r: 4.5,
                fill: colors.series.green,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
            />
          )}

          {/* 3. 12-Solve Moving Average (Ao12) */}
          {showAo12 && (
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="ao12"
              name="Ao12"
              stroke={colors.series.orange}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: colors.series.orange,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
            />
          )}

          {/* 4. 50-Solve Moving Average (Ao50) */}
          {showAo50 && (
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="ao50"
              name="Ao50"
              stroke={colors.series.blue}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5.5,
                fill: colors.series.blue,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
            />
          )}

          {/* 5. 100-Solve Moving Average (Ao100) */}
          {showAo100 && (
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="ao100"
              name="Ao100"
              stroke={colors.series.purple}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: colors.series.purple,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
            />
          )}

          {/* 6. Custom Ao N Moving Average */}
          {showCustomAo && customAoN >= 3 && (
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="customAo"
              name={`Ao${customAoN}`}
              stroke={colors.series.amber}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: colors.series.amber,
                stroke: colors.bgCard,
                strokeWidth: 1.5,
              }}
            />
          )}

          {/* 7. Overall/Range Trend Line */}
          {showTrend && (
            <Line
              isAnimationActive={false}
              type="linear"
              dataKey="trend"
              name={`Trend (${slopeFormatted})`}
              stroke={colors.series.red}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
