import { Award, ChevronDown, ChevronUp, Flame, History, Sparkles, Trophy, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
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
import type { GroupingPeriod, PbDataPoint, Solve } from '../types';
import { calculatePbProgression, getPeriodUnitInfo } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

interface PbProgressionChartProps {
  id?: string;
  solves: Solve[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const PbProgressionChart: React.FC<PbProgressionChartProps> = ({
  id = 'pb-progression-chart',
  solves,
  groupingPeriod = 'daily',
  title = 'PB Progression Over Time',
}) => {
  const [showSingle, setShowSingle] = useState(true);
  const [showAo5, setShowAo5] = useState(true);
  const [showAo12, setShowAo12] = useState(true);
  const [showAo50, setShowAo50] = useState(true);
  const [showAo100, setShowAo100] = useState(true);
  const [showRawSolves, setShowRawSolves] = useState(false);
  const [showMilestoneList, setShowMilestoneList] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<
    'All' | 'Single' | 'Ao5' | 'Ao12' | 'Ao50' | 'Ao100'
  >('All');
  const { containerRef, tooltipActive, touchHandlers } = useAutoDismissTooltip();

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

  const _unitInfo = getPeriodUnitInfo(groupingPeriod);

  const pbResult = useMemo(() => calculatePbProgression(solves), [solves]);
  const { dataPoints, summary, pbMilestones } = pbResult;

  // Compute Y-axis bounds
  const { minY, maxY } = useMemo(() => {
    const validPbs: number[] = [];
    if (dataPoints.length > 0) {
      dataPoints.forEach((dp) => {
        if (showSingle && dp.pbSingle) validPbs.push(dp.pbSingle);
        if (showAo5 && dp.pbAo5) validPbs.push(dp.pbAo5);
        if (showAo12 && dp.pbAo12) validPbs.push(dp.pbAo12);
        if (showAo50 && dp.pbAo50) validPbs.push(dp.pbAo50);
        if (showAo100 && dp.pbAo100) validPbs.push(dp.pbAo100);
        if (showRawSolves && dp.single) validPbs.push(dp.single);
      });
    }

    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;
    for (const val of validPbs) {
      if (val < rawMin) rawMin = val;
      if (val > rawMax) rawMax = val;
    }
    const min = validPbs.length === 0 ? 0 : Math.max(0, Math.floor(rawMin - 1));
    const max = validPbs.length === 0 ? 30 : Math.ceil(rawMax + 2);
    return { minY: min, maxY: max };
  }, [dataPoints, showSingle, showAo5, showAo12, showAo50, showAo100, showRawSolves]);

  const filteredMilestones = useMemo(
    () =>
      milestoneFilter === 'All'
        ? pbMilestones
        : pbMilestones.filter((m) => m.type === milestoneFilter),
    [pbMilestones, milestoneFilter],
  );

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: PbDataPoint }>;
    label?: string | number;
  }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    const hasNewPb =
      (showSingle && data.isNewPbSingle) ||
      (showAo5 && data.isNewPbAo5) ||
      (showAo12 && data.isNewPbAo12) ||
      (showAo50 && data.isNewPbAo50) ||
      (showAo100 && data.isNewPbAo100);

    return (
      <div className="max-w-[240px] sm:max-w-xs rounded-xl border border-stone-700/80 bg-stone-900/95 p-2.5 sm:p-3 text-xs text-stone-200 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between border-b border-stone-800 pb-1.5 font-semibold text-stone-100">
          <span className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Solve #{label}
          </span>
          <span className="font-normal text-stone-400">{data.dateStr}</span>
        </div>

        {hasNewPb && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-[11px] font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              New Record Set!{' '}
              {[
                showSingle && data.isNewPbSingle && 'Single',
                showAo5 && data.isNewPbAo5 && 'Ao5',
                showAo12 && data.isNewPbAo12 && 'Ao12',
                showAo50 && data.isNewPbAo50 && 'Ao50',
                showAo100 && data.isNewPbAo100 && 'Ao100',
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}

        <div className="space-y-1">
          {data.single != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="text-stone-400">Solve Time:</span>
              <span className="font-mono font-bold text-stone-100">
                {data.single.toFixed(2)}s
                {data.penalty === '+2' && <span className="ml-1 text-amber-400">(+2)</span>}
              </span>
            </div>
          )}
          {showSingle && data.pbSingle != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="h-3 w-3 shrink-0" /> PB Single:
              </span>
              <span className="font-mono font-semibold text-amber-300">
                {data.pbSingle.toFixed(2)}s
                {data.isNewPbSingle && data.dropSingle != null && data.dropSingle > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropSingle.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {showAo5 && data.pbAo5 != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="flex items-center gap-1 text-orange-400">
                <Zap className="h-3 w-3 shrink-0" /> PB Ao5:
              </span>
              <span className="font-mono font-semibold text-orange-300">
                {data.pbAo5.toFixed(2)}s
                {data.isNewPbAo5 && data.dropAo5 != null && data.dropAo5 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo5.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {showAo12 && data.pbAo12 != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="flex items-center gap-1 text-sky-400">
                <Award className="h-3 w-3 shrink-0" /> PB Ao12:
              </span>
              <span className="font-mono font-semibold text-sky-300">
                {data.pbAo12.toFixed(2)}s
                {data.isNewPbAo12 && data.dropAo12 != null && data.dropAo12 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo12.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {showAo50 && data.pbAo50 != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="flex items-center gap-1 text-purple-400">
                <Trophy className="h-3 w-3 shrink-0" /> PB Ao50:
              </span>
              <span className="font-mono font-semibold text-purple-300">
                {data.pbAo50.toFixed(2)}s
                {data.isNewPbAo50 && data.dropAo50 != null && data.dropAo50 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo50.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {showAo100 && data.pbAo100 != null && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="flex items-center gap-1 text-emerald-400">
                <Award className="h-3 w-3 shrink-0" /> PB Ao100:
              </span>
              <span className="font-mono font-semibold text-emerald-300">
                {data.pbAo100.toFixed(2)}s
                {data.isNewPbAo100 && data.dropAo100 != null && data.dropAo100 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo100.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {data.scramble && (
          <div className="mt-2 max-w-[215px] truncate border-t border-stone-800 pt-2 font-mono text-[10px] text-stone-400 sm:max-w-none">
            Scramble: {data.scramble}
          </div>
        )}
      </div>
    );
  };

  return (
    <ChartCardWrapper
      id={id}
      title={title}
      subtitle="Step-down personal record progression curves tracking step functions of historical best single times and WCA averages."
      mobileSubtitle="Step-down curves tracking PB singles and WCA rolling averages."
      headerBadge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          PB Records
        </span>
      }
      filenamePrefix="pb_progression"
      headerControls={
        <div className="flex w-full min-w-0 flex-wrap items-center py-0.5">
          {/* Controls to toggle line visibility */}
          <div
            id="pb-metric-toggles"
            className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-800/80 p-1 text-xs"
          >
            <span className="hidden px-1 text-[11px] font-medium text-stone-400 sm:inline">
              Metrics:
            </span>
            <button
              type="button"
              id="pb-show-single"
              aria-label="Single"
              aria-pressed={showSingle}
              onClick={() => setShowSingle(!showSingle)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showSingle
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="hidden sm:inline">Single</span>
              <span className="sm:hidden">1</span>
            </button>
            <button
              type="button"
              id="pb-show-ao5"
              aria-label="Ao5"
              aria-pressed={showAo5}
              onClick={() => setShowAo5(!showAo5)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo5
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="hidden sm:inline">Ao5</span>
              <span className="sm:hidden">5</span>
            </button>
            <button
              type="button"
              id="pb-show-ao12"
              aria-label="Ao12"
              aria-pressed={showAo12}
              onClick={() => setShowAo12(!showAo12)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo12
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="hidden sm:inline">Ao12</span>
              <span className="sm:hidden">12</span>
            </button>
            <button
              type="button"
              id="pb-show-ao50"
              aria-label="Ao50"
              aria-pressed={showAo50}
              onClick={() => setShowAo50(!showAo50)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo50
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="hidden sm:inline">Ao50</span>
              <span className="sm:hidden">50</span>
            </button>
            <button
              type="button"
              id="pb-show-ao100"
              aria-label="Ao100"
              aria-pressed={showAo100}
              onClick={() => setShowAo100(!showAo100)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo100
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="hidden sm:inline">Ao100</span>
              <span className="sm:hidden">100</span>
            </button>
            <button
              type="button"
              id="pb-show-solves-overlay"
              aria-label="Solves Overlay"
              aria-pressed={showRawSolves}
              onClick={() => setShowRawSolves(!showRawSolves)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showRawSolves
                  ? 'bg-stone-700 text-stone-100 border border-stone-600 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span className="sm:hidden">Solves</span>
              <span className="hidden sm:inline">Solves Overlay</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Top Stat Badges Summary */}
      <div className="mb-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1 rounded-xl border border-amber-500/20 bg-stone-950/60 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-amber-400">
            <span className="flex items-center gap-1 truncate">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PB Single</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              {summary.totalSinglePbs} set
            </span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-amber-200">
            {summary.currentPbSingle ? `${summary.currentPbSingle.toFixed(2)}s` : '—'}
          </div>
          {summary.singlePbImprovement > 0 && (
            <div className="truncate text-[10px] sm:text-[11px] font-medium text-emerald-400">
              -{summary.singlePbImprovement.toFixed(2)}s overall drop
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-orange-500/20 bg-stone-950/60 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-orange-400">
            <span className="flex items-center gap-1 truncate">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PB Ao5</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">
              {summary.totalAo5Pbs} set
            </span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-orange-200">
            {summary.currentPbAo5 ? `${summary.currentPbAo5.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-sky-500/20 bg-stone-950/60 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-sky-400">
            <span className="flex items-center gap-1 truncate">
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PB Ao12</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
              {summary.totalAo12Pbs} set
            </span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-sky-200">
            {summary.currentPbAo12 ? `${summary.currentPbAo12.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-purple-500/20 bg-stone-950/60 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-purple-400">
            <span className="flex items-center gap-1 truncate">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PB Ao50</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
              {summary.totalAo50Pbs} set
            </span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-purple-200">
            {summary.currentPbAo50 ? `${summary.currentPbAo50.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/20 bg-stone-950/60 p-2.5 sm:p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-1 text-xs font-medium text-emerald-400">
            <span className="flex items-center gap-1 truncate">
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PB Ao100</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
              {summary.totalAo100Pbs} set
            </span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-emerald-200">
            {summary.currentPbAo100 ? `${summary.currentPbAo100.toFixed(2)}s` : '—'}
          </div>
        </div>
      </div>

      {/* Main Plot */}
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
            data={dataPoints}
            margin={{
              top: isMobileScreen ? 15 : 25,
              right: isMobileScreen ? 4 : 30,
              left: isMobileScreen ? 2 : 10,
              bottom: isMobileScreen ? 20 : 25,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="index"
              interval={Math.max(1, Math.floor(dataPoints.length / (isMobileScreen ? 6 : 10)))}
              stroke="#94a3b8"
              fontSize={isMobileScreen ? 10 : 11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: `Solve Number (${solves.length} Total Solves)`,
                position: 'insideBottom',
                offset: isMobileScreen ? -12 : -15,
                fill: '#94a3b8',
                fontSize: isMobileScreen ? 11 : 12,
              }}
            />
            <YAxis
              width={isMobileScreen ? 26 : 42}
              stroke="#94a3b8"
              fontSize={isMobileScreen ? 10 : 11}
              domain={[minY, maxY]}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={
                isMobileScreen
                  ? undefined
                  : {
                      value: 'Personal Best Time (seconds)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 5,
                      fill: '#94a3b8',
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
              wrapperStyle={{
                paddingBottom: isMobileScreen ? '10px' : '15px',
                fontSize: isMobileScreen ? '11px' : '12px',
              }}
            />

            {/* Optional Raw Solves Overlay */}
            {showRawSolves && (
              <Line
                isAnimationActive={false}
                type="linear"
                dataKey="single"
                name="Individual Solve Time"
                stroke="#64748b"
                strokeWidth={0.75}
                strokeOpacity={0.25}
                dot={{ r: 1, fill: '#64748b', stroke: 'none' }}
                activeDot={{ r: 4, fill: '#94a3b8' }}
              />
            )}

            {/* PB Single Step Line */}
            {showSingle && (
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="pbSingle"
                name="PB Single"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: { index: number; isNewPbSingle?: boolean };
                }) => {
                  const { cx, cy, payload } = props;
                  if (payload.isNewPbSingle) {
                    return (
                      <circle
                        key={`pb-single-${payload.index}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${payload.index}`} />;
                }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* PB Ao5 Step Line */}
            {showAo5 && (
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="pbAo5"
                name="PB Ao5"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: { index: number; isNewPbAo5?: boolean };
                }) => {
                  const { cx, cy, payload } = props;
                  if (payload.isNewPbAo5) {
                    return (
                      <circle
                        key={`pb-ao5-${payload.index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#f97316"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${payload.index}`} />;
                }}
                activeDot={{ r: 6, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* PB Ao12 Step Line */}
            {showAo12 && (
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="pbAo12"
                name="PB Ao12"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: { index: number; isNewPbAo12?: boolean };
                }) => {
                  const { cx, cy, payload } = props;
                  if (payload.isNewPbAo12) {
                    return (
                      <circle
                        key={`pb-ao12-${payload.index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${payload.index}`} />;
                }}
                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* PB Ao50 Step Line */}
            {showAo50 && (
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="pbAo50"
                name="PB Ao50"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: { index: number; isNewPbAo50?: boolean };
                }) => {
                  const { cx, cy, payload } = props;
                  if (payload.isNewPbAo50) {
                    return (
                      <circle
                        key={`pb-ao50-${payload.index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#8b5cf6"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${payload.index}`} />;
                }}
                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* PB Ao100 Step Line */}
            {showAo100 && (
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="pbAo100"
                name="PB Ao100"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  payload: { index: number; isNewPbAo100?: boolean };
                }) => {
                  const { cx, cy, payload } = props;
                  if (payload.isNewPbAo100) {
                    return (
                      <circle
                        key={`pb-ao100-${payload.index}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${payload.index}`} />;
                }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile-only bottom axis title aligned with the graph edges, using graph-matching font & color */}
      {isMobileScreen && (
        <div
          id="pb-mobile-axis-title"
          className="-mt-1.5 flex items-center justify-between px-1 text-[11px] leading-tight select-none"
        >
          <span style={{ color: '#94a3b8' }}>Personal Best Time (s)</span>
        </div>
      )}

      {/* Expandable PB Record Milestones Drawer */}
      <div className="mt-1 border-t border-stone-800 pt-3">
        <button
          type="button"
          id="pb-milestones-history-toggle"
          aria-label={`Record Milestones History (${pbMilestones.length} Record Breaks)`}
          onClick={() => setShowMilestoneList(!showMilestoneList)}
          className="flex w-full cursor-pointer items-center justify-between py-1 text-xs font-semibold text-stone-300 transition-colors hover:text-stone-100"
        >
          <span className="flex items-center gap-2 min-w-0">
            <History className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="truncate">
              <span className="sm:hidden">Milestones ({pbMilestones.length})</span>
              <span className="hidden sm:inline">
                Record Milestones History ({pbMilestones.length} Record Breaks)
              </span>
            </span>
          </span>
          {showMilestoneList ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
          )}
        </button>

        {showMilestoneList && (
          <div className="fade-in mt-3 flex animate-in flex-col gap-3 duration-200">
            {/* Filter Pills */}
            <div
              id="pb-milestones-filters"
              className="flex flex-wrap items-center gap-1.5 py-1 text-xs"
            >
              <span className="mr-1 shrink-0 text-[11px] text-stone-400 sm:hidden">Filter:</span>
              <span className="mr-1 shrink-0 text-[11px] text-stone-400 hidden sm:inline">
                Filter Record Type:
              </span>
              {[
                { key: 'All', label: 'All', mobileLabel: 'All' },
                { key: 'Single', label: 'Single', mobileLabel: '1' },
                { key: 'Ao5', label: 'Ao5', mobileLabel: '5' },
                { key: 'Ao12', label: 'Ao12', mobileLabel: '12' },
                { key: 'Ao50', label: 'Ao50', mobileLabel: '50' },
                { key: 'Ao100', label: 'Ao100', mobileLabel: '100' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  id={`pb-milestone-filter-${cat.key}`}
                  aria-label={cat.label}
                  aria-pressed={milestoneFilter === cat.key}
                  onClick={() => setMilestoneFilter(cat.key as typeof milestoneFilter)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                    milestoneFilter === cat.key
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 border border-stone-800 bg-stone-900/60'
                  }`}
                >
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.mobileLabel}</span>
                </button>
              ))}
            </div>

            {/* Milestones Grid / List */}
            <div className="custom-scrollbar max-h-60 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {filteredMilestones.length === 0 ? (
                <p className="py-2 text-center text-stone-500 italic">
                  No record milestones for this filter.
                </p>
              ) : (
                filteredMilestones.map((m) => {
                  let badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                  if (m.type === 'Ao5')
                    badgeColor = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                  if (m.type === 'Ao12')
                    badgeColor = 'bg-sky-500/10 text-sky-300 border-sky-500/30';
                  if (m.type === 'Ao50')
                    badgeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
                  if (m.type === 'Ao100')
                    badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

                  return (
                    <div
                      key={`${m.type}-${m.index}-${m.timeSec}`}
                      className="flex flex-col justify-between gap-1.5 rounded-xl border border-stone-800/80 bg-stone-950/60 p-2 sm:p-2.5 transition-all hover:border-stone-700 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                        <span
                          className={`px-1.5 py-0.5 sm:px-2 rounded-md text-[10px] sm:text-[11px] font-semibold border ${badgeColor}`}
                        >
                          PB {m.type}
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-stone-100">
                          {m.timeSec.toFixed(2)}s
                        </span>
                        {m.dropSec > 0 && (
                          <span className="font-mono text-[10px] sm:text-xs font-medium text-emerald-400">
                            (-{m.dropSec.toFixed(2)}s)
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 font-mono text-[10px] sm:text-[11px] text-stone-400">
                        <span>
                          <span className="sm:hidden">#{m.index}</span>
                          <span className="hidden sm:inline">Solve #{m.index}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{m.dateStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </ChartCardWrapper>
  );
};
