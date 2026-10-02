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
  return (
    <div className="h-[420px] w-full pt-1">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 65,
            right: isMobileScreen ? 12 : 30,
            left: isMobileScreen ? 4 : 10,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
          <XAxis
            dataKey="index"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
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
          <Tooltip
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
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: '14px', fontSize: '12px' }}
          />

          {/* Vertical Period Boundaries (Responsive Ticks rendered vertically) */}
          {responsiveBoundaryInfo.boundaries.map((b) => (
            <ReferenceLine
              key={`period-boundary-${b.periodNumber}-${b.index}`}
              x={b.index}
              stroke="#64748b"
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
                    fill="#cbd5e1"
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

          {/* 7. Overall/Range Trend Line */}
          {showTrend && (
            <Line
              type="linear"
              dataKey="trend"
              name={`Range Trend (${slopeFormatted})`}
              stroke="#e11d48"
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
