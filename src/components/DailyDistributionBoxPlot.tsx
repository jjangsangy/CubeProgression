import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PeriodGroup, GroupingPeriod } from '../types';
import { ChartCardWrapper } from './ChartCardWrapper';
import { getPeriodUnitInfo } from '../utils/statsMath';

interface DailyDistributionBoxPlotProps {
  periodGroups: PeriodGroup[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const DailyDistributionBoxPlot: React.FC<DailyDistributionBoxPlotProps> = ({
  periodGroups,
  groupingPeriod = 'daily',
  title,
}) => {
  const unitInfo = getPeriodUnitInfo(groupingPeriod);
  const displayTitle = title || `${unitInfo.adjective} Solve Time Distribution & Variance`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const [hoveredPoint, setHoveredPoint] = useState<{
    periodIdx: number;
    time: number;
    x: number;
    y: number;
  } | null>(null);

  // Compute SVG dimensions and scale mappings dynamically based on container width
  const width = Math.max(300, containerWidth);
  const height = 400;
  const padding = { top: 40, right: 25, bottom: 60, left: 50 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Calculate Y min & max across all period groups
  const allTimes = useMemo(() => {
    const times: number[] = [];
    periodGroups.forEach((g) => {
      times.push(...g.timesSec);
    });
    return times;
  }, [periodGroups]);

  const minY = useMemo(() => {
    if (allTimes.length === 0) return 10;
    return Math.max(0, Math.floor(Math.min(...allTimes) - 2));
  }, [allTimes]);

  const maxY = useMemo(() => {
    if (allTimes.length === 0) return 45;
    return Math.ceil(Math.max(...allTimes) + 3);
  }, [allTimes]);

  // Y-axis scale function
  const yScale = (val: number) => {
    return padding.top + plotHeight - ((val - minY) / (maxY - minY)) * plotHeight;
  };

  // X-axis column centers
  const numGroups = periodGroups.length;
  const colWidth = numGroups > 0 ? plotWidth / numGroups : plotWidth;
  const boxWidth = Math.min(55, colWidth * 0.55);

  const getGroupX = (idx: number) => {
    return padding.left + idx * colWidth + colWidth / 2;
  };

  // Seeded deterministic jitter generator for scatter points
  const getJitterOffset = (seedIdx: number) => {
    // Generate pseudo-random float between -boxWidth/2 and +boxWidth/2
    const hash = Math.sin(seedIdx * 9999 + 1234) * 10000;
    const norm = hash - Math.floor(hash);
    return (norm - 0.5) * (boxWidth * 0.8);
  };

  // Color palette for boxes across period progression (Light steel blue -> Deep navy blue)
  const getBoxColor = (idx: number, total: number) => {
    const ratio = total > 1 ? idx / (total - 1) : 0.5;
    // Interpolate RGB from #dbeafe (light sky) to #1e3a8a (deep blue)
    const r = Math.round(219 - ratio * (219 - 30));
    const g = Math.round(234 - ratio * (234 - 58));
    const b = Math.round(254 - ratio * (254 - 138));
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Generate Median Trend path points
  const medianPoints = useMemo(() => {
    return periodGroups.map((g, idx) => ({
      x: getGroupX(idx),
      y: yScale(g.median),
      median: g.median,
      label: g.label,
    }));
  }, [periodGroups, minY, maxY, plotWidth, numGroups]);

  const medianPolylinePoints = medianPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Y ticks (e.g., 10, 15, 20, 25, 30, 35, 40)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (maxY - minY) > 25 ? 5 : 2;
    for (let t = Math.ceil(minY / step) * step; t <= maxY; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [minY, maxY]);

  return (
    <ChartCardWrapper
      title={displayTitle}
      subtitle="Box plots (Q1, Median, Q3, Whiskers) overlaid with individual jittered solves and connected Median Trend."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>}
      filenamePrefix={`${unitInfo.adjective.toLowerCase()}_solve_distribution_boxplot`}
      headerControls={
        <div className="flex items-center gap-2 text-xs text-stone-300">
          <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-dashed border-rose-500"></span>
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
          <span className="font-medium text-stone-300">Median Trend</span>
        </div>
      }
    >
      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[380px] sm:h-[400px] font-sans selection:bg-none block"
          preserveAspectRatio="none"
        >
          {/* Background Grid Lines */}
          {yTicks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeOpacity="0.4"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            x={18}
            y={height / 2}
            fill="#94a3b8"
            fontSize="12"
            textAnchor="middle"
            transform={`rotate(-90, 18, ${height / 2})`}
          >
            Solve Time (seconds)
          </text>

          {/* X Axis Line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#475569"
            strokeWidth="1.2"
          />

          {/* Period Groups / Box Plots */}
          {periodGroups.map((group, idx) => {
            const cx = getGroupX(idx);
            const yQ1 = yScale(group.q1);
            const yQ3 = yScale(group.q3);
            const yMedian = yScale(group.median);
            const yWLow = yScale(group.whiskerLow);
            const yWHigh = yScale(group.whiskerHigh);

            const boxColor = getBoxColor(idx, periodGroups.length);

            return (
              <g key={idx} className="group">
                {/* Vertical Whisker Line */}
                <line
                  x1={cx}
                  y1={yWLow}
                  x2={cx}
                  y2={yWHigh}
                  stroke="#64748b"
                  strokeWidth="1.8"
                />

                {/* Whisker Top Cap */}
                <line
                  x1={cx - boxWidth / 3}
                  y1={yWHigh}
                  x2={cx + boxWidth / 3}
                  y2={yWHigh}
                  stroke="#64748b"
                  strokeWidth="2"
                />

                {/* Whisker Bottom Cap */}
                <line
                  x1={cx - boxWidth / 3}
                  y1={yWLow}
                  x2={cx + boxWidth / 3}
                  y2={yWLow}
                  stroke="#64748b"
                  strokeWidth="2"
                />

                {/* Main Box Rect (Q1 to Q3) */}
                <rect
                  x={cx - boxWidth / 2}
                  y={yQ3}
                  width={boxWidth}
                  height={Math.max(2, yQ1 - yQ3)}
                  fill={boxColor}
                  fillOpacity="0.85"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  rx="3"
                />

                {/* Median Horizontal Line Inside Box */}
                <line
                  x1={cx - boxWidth / 2}
                  y1={yMedian}
                  x2={cx + boxWidth / 2}
                  y2={yMedian}
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />

                {/* Jittered Scatter Solve Dots */}
                {group.timesSec.map((t, sIdx) => {
                  const jX = cx + getJitterOffset(idx * 500 + sIdx);
                  const jY = yScale(t);
                  return (
                    <circle
                      key={sIdx}
                      cx={jX}
                      cy={jY}
                      r={2.2}
                      fill="#64748b"
                      fillOpacity="0.4"
                      stroke="#f8fafc"
                      strokeWidth="0.3"
                      onMouseEnter={() =>
                        setHoveredPoint({ periodIdx: idx, time: t, x: jX, y: jY })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="cursor-pointer hover:r-4 transition-all"
                    />
                  );
                })}

                {/* Outlier Diamond Markers */}
                {group.outliers.map((outlier, oIdx) => {
                  const oY = yScale(outlier);
                  return (
                    <polygon
                      key={oIdx}
                      points={`${cx},${oY - 4} ${cx + 4},${oY} ${cx},${oY + 4} ${cx - 4},${oY}`}
                      fill="#ef4444"
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* X Axis Period Label (Responsive tick filtering) */}
                {(() => {
                  const totalGroups = periodGroups.length;
                  let step = 1;
                  if (totalGroups > 35) step = 5;
                  else if (totalGroups > 20) step = 3;
                  else if (totalGroups > 12) step = 2;

                  const isVisible = (idx + 1) % step === 0 || idx === 0 || idx === totalGroups - 1;
                  if (!isVisible) return null;

                  return (
                    <>
                      <text
                        x={cx}
                        y={height - padding.bottom + 22}
                        fill="#cbd5e1"
                        fontSize="11"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {idx + 1}
                      </text>

                      <text
                        x={cx}
                        y={height - padding.bottom + 38}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        n={group.solves.length}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}

          {/* Median Trend Line Overlay */}
          {medianPoints.length > 1 && (
            <g>
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="6 4"
                points={medianPolylinePoints}
              />
              {medianPoints.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x}
                    y={p.y - 9}
                    fill="#f8fafc"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.median.toFixed(1)}s
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* X Axis Title */}
          <text
            x={width / 2}
            y={height - 8}
            fill="#94a3b8"
            fontSize="12"
            textAnchor="middle"
          >
            {unitInfo.axisLabel}
          </text>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 45}px`,
            }}
            className="absolute transform -translate-x-1/2 pointer-events-none bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-[11px] font-mono text-stone-100 shadow-xl z-20"
          >
            <div className="font-semibold text-amber-400">
              {periodGroups[hoveredPoint.periodIdx]?.label || `${unitInfo.unitSingular} ${hoveredPoint.periodIdx + 1}`}
            </div>
            <div>Solve: {hoveredPoint.time.toFixed(2)}s</div>
          </div>
        )}
      </div>
    </ChartCardWrapper>
  );
};
