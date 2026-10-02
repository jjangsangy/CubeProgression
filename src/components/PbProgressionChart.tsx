import { Award, ChevronDown, ChevronUp, Flame, History, Sparkles, Trophy, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
import type { GroupingPeriod, PbDataPoint, Solve } from '../types';
import { calculatePbProgression, getPeriodUnitInfo } from '../utils/statsMath';
import { ChartCardWrapper } from './ChartCardWrapper';

interface PbProgressionChartProps {
  solves: Solve[];
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export const PbProgressionChart: React.FC<PbProgressionChartProps> = ({
  solves,
  groupingPeriod = 'daily',
  title = 'Personal Best (PB) Progression Over Time',
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

  const _unitInfo = getPeriodUnitInfo(groupingPeriod);

  const pbResult = useMemo(() => {
    return calculatePbProgression(solves);
  }, [solves]);

  const { dataPoints, summary, pbMilestones } = pbResult;

  // Compute Y-axis bounds
  const minY = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    const validPbs: number[] = [];
    dataPoints.forEach((dp) => {
      if (showSingle && dp.pbSingle) validPbs.push(dp.pbSingle);
      if (showAo5 && dp.pbAo5) validPbs.push(dp.pbAo5);
      if (showAo12 && dp.pbAo12) validPbs.push(dp.pbAo12);
      if (showAo50 && dp.pbAo50) validPbs.push(dp.pbAo50);
      if (showAo100 && dp.pbAo100) validPbs.push(dp.pbAo100);
      if (showRawSolves && dp.single) validPbs.push(dp.single);
    });
    if (validPbs.length === 0) return 0;
    return Math.max(0, Math.floor(Math.min(...validPbs) - 1));
  }, [dataPoints, showSingle, showAo5, showAo12, showAo50, showAo100, showRawSolves]);

  const maxY = useMemo(() => {
    if (dataPoints.length === 0) return 30;
    const validPbs: number[] = [];
    dataPoints.forEach((dp) => {
      if (showSingle && dp.pbSingle) validPbs.push(dp.pbSingle);
      if (showAo5 && dp.pbAo5) validPbs.push(dp.pbAo5);
      if (showAo12 && dp.pbAo12) validPbs.push(dp.pbAo12);
      if (showAo50 && dp.pbAo50) validPbs.push(dp.pbAo50);
      if (showAo100 && dp.pbAo100) validPbs.push(dp.pbAo100);
      if (showRawSolves && dp.single) validPbs.push(dp.single);
    });
    if (validPbs.length === 0) return 30;
    return Math.ceil(Math.max(...validPbs) + 2);
  }, [dataPoints, showSingle, showAo5, showAo12, showAo50, showAo100, showRawSolves]);

  const filteredMilestones = useMemo(() => {
    if (milestoneFilter === 'All') return pbMilestones;
    return pbMilestones.filter((m) => m.type === milestoneFilter);
  }, [pbMilestones, milestoneFilter]);

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
      data.isNewPbSingle ||
      data.isNewPbAo5 ||
      data.isNewPbAo12 ||
      data.isNewPbAo50 ||
      data.isNewPbAo100;

    return (
      <div className="max-w-xs rounded-xl border border-stone-700/80 bg-stone-900/95 p-3 text-xs text-stone-200 shadow-2xl backdrop-blur-md">
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
                data.isNewPbSingle && 'Single',
                data.isNewPbAo5 && 'Ao5',
                data.isNewPbAo12 && 'Ao12',
                data.isNewPbAo50 && 'Ao50',
                data.isNewPbAo100 && 'Ao100',
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}

        <div className="space-y-1">
          {data.single != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-400">Solve Time:</span>
              <span className="font-mono font-bold text-stone-100">
                {data.single.toFixed(2)}s
                {data.penalty === '+2' && <span className="ml-1 text-amber-400">(+2)</span>}
              </span>
            </div>
          )}
          {data.pbSingle != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="h-3 w-3" /> PB Single:
              </span>
              <span className="font-mono font-semibold text-amber-300">
                {data.pbSingle.toFixed(2)}s
                {data.dropSingle != null && data.dropSingle > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropSingle.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {data.pbAo5 != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-orange-400">
                <Zap className="h-3 w-3" /> PB Ao5:
              </span>
              <span className="font-mono font-semibold text-orange-300">
                {data.pbAo5.toFixed(2)}s
                {data.dropAo5 != null && data.dropAo5 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo5.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {data.pbAo12 != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-sky-400">
                <Award className="h-3 w-3" /> PB Ao12:
              </span>
              <span className="font-mono font-semibold text-sky-300">
                {data.pbAo12.toFixed(2)}s
                {data.dropAo12 != null && data.dropAo12 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo12.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {data.pbAo50 != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-purple-400">
                <Trophy className="h-3 w-3" /> PB Ao50:
              </span>
              <span className="font-mono font-semibold text-purple-300">
                {data.pbAo50.toFixed(2)}s
                {data.dropAo50 != null && data.dropAo50 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo50.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
          {data.pbAo100 != null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1 text-emerald-400">
                <Award className="h-3 w-3" /> PB Ao100:
              </span>
              <span className="font-mono font-semibold text-emerald-300">
                {data.pbAo100.toFixed(2)}s
                {data.dropAo100 != null && data.dropAo100 > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-400">
                    (-{data.dropAo100.toFixed(2)}s)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {data.scramble && (
          <div className="mt-2 truncate border-t border-stone-800 pt-2 font-mono text-[10px] text-stone-400">
            Scramble: {data.scramble}
          </div>
        )}
      </div>
    );
  };

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Step-down personal record progression curves tracking step functions of historical best single times and WCA averages."
      headerBadge={
        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span>PB Records</span>
        </div>
      }
      filenamePrefix="pb_progression"
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Controls to toggle line visibility */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-stone-700/60 bg-stone-800/80 p-1 text-xs">
            <span className="px-1 text-[11px] font-medium text-stone-400">Metrics:</span>
            <button
              type="button"
              onClick={() => setShowSingle(!showSingle)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showSingle
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setShowAo5(!showAo5)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo5
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Ao5
            </button>
            <button
              type="button"
              onClick={() => setShowAo12(!showAo12)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo12
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Ao12
            </button>
            <button
              type="button"
              onClick={() => setShowAo50(!showAo50)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo50
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Ao50
            </button>
            <button
              type="button"
              onClick={() => setShowAo100(!showAo100)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showAo100
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Ao100
            </button>
            <button
              type="button"
              onClick={() => setShowRawSolves(!showRawSolves)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                showRawSolves
                  ? 'bg-stone-700 text-stone-100 border border-stone-600 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Solves Overlay
            </button>
          </div>
        </div>
      }
    >
      {/* Top Stat Badges Summary */}
      <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1 rounded-xl border border-amber-500/20 bg-stone-950/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-amber-400">
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> PB Single
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              {summary.totalSinglePbs} set
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-amber-200">
            {summary.currentPbSingle ? `${summary.currentPbSingle.toFixed(2)}s` : '—'}
          </div>
          {summary.singlePbImprovement > 0 && (
            <div className="text-[11px] font-medium text-emerald-400">
              -{summary.singlePbImprovement.toFixed(2)}s overall drop
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-orange-500/20 bg-stone-950/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-orange-400">
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" /> PB Ao5
            </span>
            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">
              {summary.totalAo5Pbs} set
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-orange-200">
            {summary.currentPbAo5 ? `${summary.currentPbAo5.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-sky-500/20 bg-stone-950/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-sky-400">
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> PB Ao12
            </span>
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
              {summary.totalAo12Pbs} set
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-sky-200">
            {summary.currentPbAo12 ? `${summary.currentPbAo12.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-purple-500/20 bg-stone-950/60 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-purple-400">
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> PB Ao50
            </span>
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-300">
              {summary.totalAo50Pbs} set
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-purple-200">
            {summary.currentPbAo50 ? `${summary.currentPbAo50.toFixed(2)}s` : '—'}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/20 bg-stone-950/60 p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> PB Ao100
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
              {summary.totalAo100Pbs} set
            </span>
          </div>
          <div className="font-mono text-xl font-bold text-emerald-200">
            {summary.currentPbAo100 ? `${summary.currentPbAo100.toFixed(2)}s` : '—'}
          </div>
        </div>
      </div>

      {/* Main Plot */}
      <div className="h-[400px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataPoints} margin={{ top: 25, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="index"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: `Solve Number (${solves.length} Total Solves)`,
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
                value: 'Personal Best Time (seconds)',
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

            {/* Optional Raw Solves Overlay */}
            {showRawSolves && (
              <Line
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

      {/* Expandable PB Record Milestones Drawer */}
      <div className="mt-1 border-t border-stone-800 pt-3">
        <button
          type="button"
          onClick={() => setShowMilestoneList(!showMilestoneList)}
          className="flex w-full cursor-pointer items-center justify-between py-1 text-xs font-semibold text-stone-300 transition-colors hover:text-stone-100"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" />
            <span>Record Milestones History ({pbMilestones.length} Record Breaks)</span>
          </span>
          {showMilestoneList ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>

        {showMilestoneList && (
          <div className="fade-in mt-3 flex animate-in flex-col gap-3 duration-200">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="mr-1 text-[11px] text-stone-400">Filter Record Type:</span>
              {(['All', 'Single', 'Ao5', 'Ao12', 'Ao50', 'Ao100'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMilestoneFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    milestoneFilter === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 border border-stone-700/50'
                  }`}
                >
                  {cat}
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
                      className="flex flex-col justify-between gap-2 rounded-xl border border-stone-800/80 bg-stone-950/60 p-2.5 transition-all hover:border-stone-700 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeColor}`}
                        >
                          PB {m.type}
                        </span>
                        <span className="font-mono text-sm font-bold text-stone-100">
                          {m.timeSec.toFixed(2)}s
                        </span>
                        {m.dropSec > 0 && (
                          <span className="font-mono text-xs font-medium text-emerald-400">
                            (-{m.dropSec.toFixed(2)}s)
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-stone-400">
                        <span>Solve #{m.index}</span>
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
