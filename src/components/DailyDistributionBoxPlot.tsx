import { BarChart2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAutoDismissTooltip } from '../hooks/useAutoDismissTooltip';
import type { GroupingPeriod, PeriodGroup } from '../types';
import { getPeriodUnitInfo } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

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
  const displayTitle = title || `${unitInfo.adjective} Solve Distribution`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

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

  useEffect(() => {
    if (!containerRef.current) return;

    if (typeof ResizeObserver === 'undefined') {
      if (containerRef.current.clientWidth > 0) {
        setContainerWidth(containerRef.current.clientWidth);
      }
      return;
    }

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

  const { touchHandlers } = useAutoDismissTooltip({
    containerRef,
    onDismiss: () => setHoveredPoint(null),
  });

  // Compute SVG dimensions and scale mappings dynamically based on container width
  const width = Math.max(300, containerWidth);
  const height = isMobileScreen ? 380 : 400;
  const padding = isMobileScreen
    ? { top: 35, right: 12, bottom: 66, left: 28 }
    : { top: 40, right: 25, bottom: 68, left: 50 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Calculate Y min & max across all period groups
  const allTimes = periodGroups.flatMap((g) => g.timesSec);

  const minY = allTimes.length === 0 ? 10 : Math.max(0, Math.floor(Math.min(...allTimes) - 2));

  const maxY = allTimes.length === 0 ? 45 : Math.ceil(Math.max(...allTimes) + 3);

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

  // Generate Median Trend path points (skipping empty groups with 0 valid times)
  const medianPoints = periodGroups
    .map((g, idx) => ({
      x: getGroupX(idx),
      y: yScale(g.median),
      median: g.median,
      label: g.label,
      hasData: g.timesSec.length > 0,
    }))
    .filter((p) => p.hasData);

  const medianPolylinePoints = medianPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Y ticks (e.g., 10, 15, 20, 25, 30, 35, 40)
  const yTicks: number[] = [];
  const step = maxY - minY > 25 ? 5 : 2;
  for (let t = Math.ceil(minY / step) * step; t <= maxY; t += step) {
    yTicks.push(t);
  }

  return (
    <ChartCardWrapper
      testId="chart-card-distribution"
      title={displayTitle}
      subtitle="Box plots (Q1, Median, Q3, Whiskers) overlaid with individual jittered solves and connected Median Trend."
      mobileSubtitle="Box plots with jittered solves and connected Median Trend."
      headerBadge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
          <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
          Time Distribution
        </span>
      }
      filenamePrefix={`${unitInfo.adjective.toLowerCase()}_solve_distribution_boxplot`}
      headerControls={
        <div className="flex items-center gap-2 text-xs text-stone-300">
          <span className="inline-block h-0.5 w-3 border-t border-dashed border-rose-500 bg-rose-500"></span>
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500"></span>
          <span className="font-medium text-stone-300">
            <span className="hidden sm:inline">Median Trend</span>
            <span className="sm:hidden">Median</span>
          </span>
        </div>
      }
    >
      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full" {...touchHandlers}>
        <svg
          role="img"
          aria-label={displayTitle}
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[380px] w-full font-sans selection:bg-none sm:h-[400px]"
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
                  key={tick}
                  x={padding.left - (isMobileScreen ? 6 : 12)}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize={isMobileScreen ? 10 : 11}
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          {!isMobileScreen && (
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
          )}

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
            const hasData = group.timesSec.length > 0;
            const yQ1 = yScale(group.q1);
            const yQ3 = yScale(group.q3);
            const yMedian = yScale(group.median);
            const yWLow = yScale(group.whiskerLow);
            const yWHigh = yScale(group.whiskerHigh);

            const boxColor = getBoxColor(idx, periodGroups.length);

            return (
              <g key={group.label} className="group">
                {hasData && (
                  <>
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
                    {group.solves
                      .filter((s) => s.penalty !== 'DNF')
                      .map((solve) => {
                        const jX = cx + getJitterOffset(solve.id);
                        const jY = yScale(solve.finalTimeSec);
                        return (
                          <circle
                            key={`solve-${solve.id}`}
                            cx={jX}
                            cy={jY}
                            r={2.2}
                            className="cursor-pointer"
                            fill="#64748b"
                            fillOpacity="0.4"
                            stroke="#f8fafc"
                            strokeWidth="0.3"
                            onPointerEnter={() =>
                              setHoveredPoint({
                                periodIdx: idx,
                                time: solve.finalTimeSec,
                                x: jX,
                                y: jY,
                              })
                            }
                            onPointerLeave={() => setHoveredPoint(null)}
                            onTouchStart={() =>
                              setHoveredPoint({
                                periodIdx: idx,
                                time: solve.finalTimeSec,
                                x: jX,
                                y: jY,
                              })
                            }
                          />
                        );
                      })}
                  </>
                )}

                {/* X Axis Tick & Date Label */}
                {/* Outlier Diamond Markers */}
                {group.solves
                  .filter(
                    (s) =>
                      s.penalty !== 'DNF' &&
                      (s.finalTimeSec < group.whiskerLow || s.finalTimeSec > group.whiskerHigh),
                  )
                  .map((outlierSolve) => {
                    const oY = yScale(outlierSolve.finalTimeSec);
                    return (
                      <polygon
                        key={`outlier-${outlierSolve.id}`}
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
                        y={height - padding.bottom + 18}
                        fill="#cbd5e1"
                        fontSize={isMobileScreen ? 10 : 11}
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {idx + 1}
                      </text>

                      <text
                        x={cx}
                        y={height - padding.bottom + 32}
                        fill="#64748b"
                        fontSize={isMobileScreen ? 9 : 10}
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
              {medianPoints.map((p) => (
                <g key={p.label}>
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
            y={height - 10}
            fill="#94a3b8"
            fontSize={isMobileScreen ? 11 : 12}
            textAnchor="middle"
          >
            {unitInfo.axisLabel}
          </text>
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint &&
          (() => {
            const xPercent = (hoveredPoint.x / width) * 100;
            const yPercent = (hoveredPoint.y / height) * 100;
            const isNearLeft = xPercent < 24;
            const isNearRight = xPercent > 76;
            const isNearTop = hoveredPoint.y < 65;

            const transformClass = isNearLeft
              ? 'translate-x-0'
              : isNearRight
                ? '-translate-x-full'
                : '-translate-x-1/2';

            const leftStyle = isNearLeft
              ? `${Math.max(2, xPercent)}%`
              : isNearRight
                ? `${Math.min(98, xPercent)}%`
                : `${xPercent}%`;

            const topStyle = isNearTop
              ? `calc(${yPercent}% + 14px)`
              : `calc(${Math.max(15, yPercent)}% - 50px)`;

            return (
              <div
                style={{
                  left: leftStyle,
                  top: topStyle,
                }}
                className={`pointer-events-none absolute z-20 transform ${transformClass} rounded-xl border border-stone-700/80 bg-stone-900/95 p-2 text-xs text-stone-200 shadow-2xl backdrop-blur-md sm:p-2.5`}
              >
                <div className="mb-1 flex items-center justify-between gap-3 border-b border-stone-800 pb-1 font-semibold text-stone-100">
                  <span className="text-amber-400">
                    {periodGroups[hoveredPoint.periodIdx]?.label ||
                      `${unitInfo.unitSingular} ${hoveredPoint.periodIdx + 1}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-400">Solve:</span>{' '}
                  <span className="font-mono font-bold text-stone-100">
                    {hoveredPoint.time.toFixed(2)}s
                  </span>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Mobile-only bottom axis title aligned with the graph edges, using graph-matching font & color */}
      {isMobileScreen && (
        <div className="-mt-1.5 flex items-center justify-between px-1 text-[11px] leading-tight select-none">
          <span style={{ color: '#94a3b8' }}>Time (s)</span>
        </div>
      )}
    </ChartCardWrapper>
  );
};
