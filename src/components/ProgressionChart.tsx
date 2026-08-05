import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Filter,
  RotateCcw,
  Calendar,
  Hash,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Solve, PeriodGroup, LinearRegression, GroupingPeriod } from '../types';
import { ChartCardWrapper } from './ChartCardWrapper';
import { getPeriodUnitInfo, calculateAoN, calculateLinearRegression } from '../utils/statsMath';

interface ProgressionChartProps {
  solves: Solve[];
  periodGroups: PeriodGroup[];
  regression: LinearRegression;
  groupingPeriod?: GroupingPeriod;
  title?: string;
}

export type SolveVisibilityMode = 'muted' | 'unmuted' | 'dots' | 'hidden' | 'visible';
export type RangeMode = 'all' | 'solveIndex' | 'dateRange';
export type RangePreset = 'all' | 'last50' | 'last100' | 'last200' | 'first100' | 'last7d' | 'last30d' | 'custom';

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  solves,
  periodGroups,
  regression,
  groupingPeriod = 'daily',
  title = 'Overall Progression & Moving Averages',
}) => {
  const [solveVisibility, setSolveVisibility] = useState<SolveVisibilityMode>('muted');
  const [showAo5, setShowAo5] = useState(true);
  const [showAo12, setShowAo12] = useState(true);
  const [showAo50, setShowAo50] = useState(true);
  const [showAo100, setShowAo100] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showCustomAo, setShowCustomAo] = useState(false);
  const [customAoN, setCustomAoN] = useState<number>(25);

  // Range Selector States
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [startSolve, setStartSolve] = useState<number>(1);
  const [endSolve, setEndSolve] = useState<number>(solves.length || 1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRangePanelOpen, setIsRangePanelOpen] = useState<boolean>(true);

  // Detect mobile viewport to optimize touch interactions & disable SVG Brush on touch screens
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const unitInfo = getPeriodUnitInfo(groupingPeriod);
  const totalCount = solves.length;
  const earliestDate = solves[0]?.dateStr || '';
  const latestDate = solves[solves.length - 1]?.dateStr || '';

  // Reset/sync range bounds whenever solves dataset changes
  useEffect(() => {
    if (solves.length > 0) {
      if (preset === 'all') {
        setStartSolve(1);
        setEndSolve(solves.length);
        setStartDate(solves[0]?.dateStr || '');
        setEndDate(solves[solves.length - 1]?.dateStr || '');
      } else {
        setStartSolve((prev) => Math.max(1, Math.min(prev, solves.length)));
        setEndSolve((prev) => Math.min(solves.length, Math.max(prev, 1)));
        if (!startDate) setStartDate(solves[0]?.dateStr || '');
        if (!endDate) setEndDate(solves[solves.length - 1]?.dateStr || '');
      }
    }
  }, [solves]);

  // Handle Preset Selection
  const applyPreset = (selectedPreset: RangePreset) => {
    setPreset(selectedPreset);
    if (totalCount === 0) return;

    if (selectedPreset === 'all') {
      setRangeMode('all');
      setStartSolve(1);
      setEndSolve(totalCount);
      setStartDate(earliestDate);
      setEndDate(latestDate);
    } else if (selectedPreset === 'last50') {
      setRangeMode('solveIndex');
      setStartSolve(Math.max(1, totalCount - 49));
      setEndSolve(totalCount);
    } else if (selectedPreset === 'last100') {
      setRangeMode('solveIndex');
      setStartSolve(Math.max(1, totalCount - 99));
      setEndSolve(totalCount);
    } else if (selectedPreset === 'last200') {
      setRangeMode('solveIndex');
      setStartSolve(Math.max(1, totalCount - 199));
      setEndSolve(totalCount);
    } else if (selectedPreset === 'first100') {
      setRangeMode('solveIndex');
      setStartSolve(1);
      setEndSolve(Math.min(totalCount, 100));
    } else if (selectedPreset === 'last7d') {
      setRangeMode('dateRange');
      const lastTs = solves[solves.length - 1]?.timestamp || Date.now();
      const targetMs = lastTs - 7 * 24 * 60 * 60 * 1000;
      const targetStr = new Date(targetMs).toISOString().split('T')[0];
      setStartDate(targetStr > earliestDate ? targetStr : earliestDate);
      setEndDate(latestDate);
    } else if (selectedPreset === 'last30d') {
      setRangeMode('dateRange');
      const lastTs = solves[solves.length - 1]?.timestamp || Date.now();
      const targetMs = lastTs - 30 * 24 * 60 * 60 * 1000;
      const targetStr = new Date(targetMs).toISOString().split('T')[0];
      setStartDate(targetStr > earliestDate ? targetStr : earliestDate);
      setEndDate(latestDate);
    }
  };

  // Filter solves based on active range selection
  const filteredSolves = useMemo(() => {
    if (solves.length === 0) return [];

    if (rangeMode === 'dateRange') {
      if (!startDate && !endDate) return solves;
      return solves.filter((s) => {
        const sDate = s.dateStr;
        const afterStart = !startDate || sDate >= startDate;
        const beforeEnd = !endDate || sDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    if (rangeMode === 'solveIndex') {
      const clampedStart = Math.max(1, Math.min(startSolve, endSolve));
      const clampedEnd = Math.min(totalCount, Math.max(startSolve, endSolve));
      return solves.filter((s) => s.index >= clampedStart && s.index <= clampedEnd);
    }

    return solves;
  }, [solves, rangeMode, startSolve, endSolve, startDate, endDate, totalCount]);

  // Re-estimate OLS Linear Regression for the filtered range
  const filteredRegression = useMemo(() => {
    return calculateLinearRegression(filteredSolves);
  }, [filteredSolves]);

  // Construct chart data for filtered range
  const chartData = useMemo(() => {
    return filteredSolves.map((solve) => {
      const fullIdx = solves.findIndex((s) => s.id === solve.id);
      const predY = filteredRegression.slope * solve.index + filteredRegression.intercept;

      const ao5 = solve.ao5 ?? calculateAoN(solves, fullIdx, 5);
      const ao12 = solve.ao12 ?? calculateAoN(solves, fullIdx, 12);
      const ao50 = solve.ao50 ?? calculateAoN(solves, fullIdx, 50);
      const ao100 = solve.ao100 ?? calculateAoN(solves, fullIdx, 100);
      const customAo = showCustomAo && customAoN >= 3 ? calculateAoN(solves, fullIdx, customAoN) : null;

      return {
        index: solve.index,
        single: solve.penalty === 'DNF' ? null : solve.finalTimeSec,
        ao5,
        ao12,
        ao50,
        ao100,
        customAo,
        trend: Number(predY.toFixed(2)),
        dateStr: solve.dateStr,
        scramble: solve.scramble,
        penalty: solve.penalty,
      };
    });
  }, [filteredSolves, filteredRegression, solves, showCustomAo, customAoN]);

  // Calculate high level stats for the focused range
  const rangeStats = useMemo(() => {
    const validTimes = filteredSolves.filter((s) => s.penalty !== 'DNF').map((s) => s.finalTimeSec);
    const count = filteredSolves.length;
    const isFiltered = count < totalCount;
    const meanSec = validTimes.length > 0 ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(2) : '-';
    const bestSec = validTimes.length > 0 ? Math.min(...validTimes).toFixed(2) : '-';
    const pctOfTotal = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '100';

    return {
      count,
      isFiltered,
      meanSec,
      bestSec,
      pctOfTotal,
    };
  }, [filteredSolves, totalCount]);

  // Filter vertical period reference lines to those matching the active range
  const periodBoundaries = useMemo(() => {
    let acc = 0;
    const boundaries: { index: number; label: string; groupLabel: string; midIndex: number }[] = [];

    periodGroups.forEach((group, idx) => {
      const count = group.solves.length;
      acc += count;
      const inRange = filteredSolves.some((s) => s.index === acc);
      if (inRange) {
        boundaries.push({
          index: acc,
          label: `${unitInfo.unitSingular} ${idx + 1}`,
          groupLabel: group.label,
          midIndex: Math.round(acc - count / 2),
        });
      }
    });

    return boundaries;
  }, [periodGroups, unitInfo, filteredSolves]);

  // Y domain with padding based on active visible metrics in filtered dataset
  const yValues = useMemo(() => {
    const vals: number[] = [];
    chartData.forEach((dp) => {
      if (solveVisibility !== 'hidden' && dp.single !== null) vals.push(dp.single);
      if (showAo5 && dp.ao5 !== null) vals.push(dp.ao5);
      if (showAo12 && dp.ao12 !== null) vals.push(dp.ao12);
      if (showAo50 && dp.ao50 !== null) vals.push(dp.ao50);
      if (showAo100 && dp.ao100 !== null) vals.push(dp.ao100);
      if (showCustomAo && dp.customAo !== null) vals.push(dp.customAo);
      if (showTrend && dp.trend !== null) vals.push(dp.trend);
    });
    return vals;
  }, [chartData, solveVisibility, showAo5, showAo12, showAo50, showAo100, showCustomAo, showTrend]);

  const minY = yValues.length > 0 ? Math.max(0, Math.floor(Math.min(...yValues) - 2)) : 0;
  const maxY = yValues.length > 0 ? Math.ceil(Math.max(...yValues) + 3) : 50;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-stone-900/95 border border-stone-700/80 rounded-xl p-3 shadow-2xl text-xs text-stone-200 backdrop-blur-md max-w-xs">
        <div className="font-semibold text-stone-100 border-b border-stone-800 pb-1.5 mb-2 flex justify-between items-center">
          <span>Solve #{label}</span>
          <span className="text-stone-400 font-normal">{data.dateStr}</span>
        </div>
        <div className="space-y-1">
          {data.single !== null && solveVisibility !== 'hidden' && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-stone-400">Single Time:</span>
              <span className="font-mono font-bold text-stone-100">
                {data.penalty === 'DNF' ? 'DNF' : `${data.single?.toFixed(2)}s`}
                {data.penalty === '+2' && <span className="text-amber-400 ml-1">(+2)</span>}
              </span>
            </div>
          )}
          {showAo5 && data.ao5 !== null && data.ao5 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-emerald-400">Ao5:</span>
              <span className="font-mono font-semibold text-emerald-300">{data.ao5.toFixed(2)}s</span>
            </div>
          )}
          {showAo12 && data.ao12 !== null && data.ao12 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-orange-400">Ao12:</span>
              <span className="font-mono font-semibold text-orange-300">{data.ao12.toFixed(2)}s</span>
            </div>
          )}
          {showAo50 && data.ao50 !== null && data.ao50 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-sky-400">Ao50:</span>
              <span className="font-mono font-semibold text-sky-300">{data.ao50.toFixed(2)}s</span>
            </div>
          )}
          {showAo100 && data.ao100 !== null && data.ao100 !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-purple-400">Ao100:</span>
              <span className="font-mono font-semibold text-purple-300">{data.ao100.toFixed(2)}s</span>
            </div>
          )}
          {showCustomAo && data.customAo !== null && data.customAo !== undefined && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-yellow-400">Ao{customAoN}:</span>
              <span className="font-mono font-semibold text-yellow-300">{data.customAo.toFixed(2)}s</span>
            </div>
          )}
          {showTrend && (
            <div className="flex justify-between items-center gap-4 border-t border-stone-800/80 pt-1 mt-1">
              <span className="text-rose-400/90">Range Trend:</span>
              <span className="font-mono text-rose-300">{data.trend?.toFixed(2)}s</span>
            </div>
          )}
        </div>
        {data.scramble && (
          <div className="mt-2.5 pt-2 border-t border-stone-800 text-[10px] text-stone-400 font-mono truncate">
            Scramble: {data.scramble}
          </div>
        )}
      </div>
    );
  };

  const singleLineStyle = useMemo(() => {
    switch (solveVisibility) {
      case 'hidden':
        return {
          stroke: 'transparent',
          strokeWidth: 0,
          strokeOpacity: 0,
          dot: false,
        };
      case 'unmuted':
      case 'visible':
        return {
          stroke: '#94a3b8',
          strokeWidth: 1,
          strokeOpacity: 0.6,
          dot: { r: 2.5, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 0.5 },
        };
      case 'dots':
        return {
          stroke: '#64748b',
          strokeWidth: 0.75,
          strokeOpacity: 0.25,
          dot: { r: 1.2, fill: '#94a3b8', fillOpacity: 0.35, stroke: 'none' },
        };
      case 'muted':
      default:
        return {
          stroke: '#64748b',
          strokeWidth: 0.75,
          strokeOpacity: 0.2,
          dot: false,
        };
    }
  }, [solveVisibility]);

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Individual solve plot with interactive range selector, toggleable moving averages (Ao5, Ao12, Ao50, Ao100, Custom N), and OLS regression."
      headerBadge={<span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>}
      filenamePrefix="progression_moving_averages"
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Controls to toggle average metrics */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs flex-wrap">
            <span className="text-stone-400 text-[11px] px-1 font-medium">Averages:</span>
            <button
              type="button"
              onClick={() => setShowAo5(!showAo5)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo5
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao5
            </button>
            <button
              type="button"
              onClick={() => setShowAo12(!showAo12)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo12
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao12
            </button>
            <button
              type="button"
              onClick={() => setShowAo50(!showAo50)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo50
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao50
            </button>
            <button
              type="button"
              onClick={() => setShowAo100(!showAo100)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showAo100
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Ao100
            </button>
            <button
              type="button"
              onClick={() => setShowTrend(!showTrend)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                showTrend
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              Trend
            </button>

            {/* Custom AoN toggle and input */}
            <div className="inline-flex items-center gap-1 border-l border-stone-700/80 pl-1.5 ml-0.5">
              <button
                type="button"
                onClick={() => setShowCustomAo(!showCustomAo)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  showCustomAo
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 border border-transparent'
                }`}
              >
                Custom Ao
              </button>
              {showCustomAo && (
                <div className="flex items-center gap-1 bg-stone-900 px-1.5 py-0.5 rounded border border-yellow-500/30">
                  <span className="text-[10px] text-stone-400 font-mono">Ao</span>
                  <input
                    type="number"
                    min="3"
                    max="1000"
                    value={customAoN}
                    onChange={(e) => setCustomAoN(Math.max(3, parseInt(e.target.value) || 3))}
                    className="w-10 bg-transparent text-xs font-mono font-bold text-yellow-200 focus:outline-none border-b border-stone-600 focus:border-yellow-400 text-center"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Controls to toggle single solve visibility */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs">
            <span className="text-stone-400 text-[11px] px-1.5 font-medium">Solves:</span>
            <button
              type="button"
              onClick={() => setSolveVisibility('muted')}
              title="Show subtle line without cluttering dots (default clean view)"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                solveVisibility === 'muted'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Muted
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('unmuted')}
              title="Show original white line and dots"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                solveVisibility === 'unmuted' || solveVisibility === 'visible'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Unmuted
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('dots')}
              title="Show subtle line with small dots"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                solveVisibility === 'dots'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              With Dots
            </button>
            <button
              type="button"
              onClick={() => setSolveVisibility('hidden')}
              title="Hide single solve line entirely"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                solveVisibility === 'hidden'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hidden
            </button>
          </div>

          {/* Toggle Range Panel Visibility Button */}
          <button
            type="button"
            onClick={() => setIsRangePanelOpen(!isRangePanelOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isRangePanelOpen || rangeStats.isFiltered
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-stone-800/80 text-stone-300 hover:text-stone-100 border-stone-700/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Range Selector</span>
            {rangeStats.isFiltered && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* RANGE SELECTOR PANEL */}
        {isRangePanelOpen && (
          <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-3.5 sm:p-4 text-xs space-y-3.5 shadow-inner">
            {/* Top Bar: Mode Switcher & Filter Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-700/50 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-stone-200 font-semibold">
                  <Filter className="w-4 h-4 text-sky-400" />
                  <span>Range Mode:</span>
                </div>
                <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-stone-900/80 border border-stone-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode('all');
                      applyPreset('all');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      rangeMode === 'all'
                        ? 'bg-sky-500 text-stone-950 font-bold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    All Solves
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode('solveIndex');
                      if (preset === 'all') applyPreset('last100');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      rangeMode === 'solveIndex'
                        ? 'bg-sky-500 text-stone-950 font-bold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    <span>Solve # Interval</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode('dateRange');
                      if (preset === 'all') applyPreset('last30d');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                      rangeMode === 'dateRange'
                        ? 'bg-sky-500 text-stone-950 font-bold shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Date Range</span>
                  </button>
                </div>
              </div>

              {/* Reset Range Button */}
              {rangeStats.isFiltered && (
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Range ({rangeStats.count} / {totalCount})</span>
                </button>
              )}
            </div>

            {/* Presets Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-stone-400 text-[11px] font-medium shrink-0">Quick Presets:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'all', label: 'All Solves' },
                  { key: 'last50', label: 'Last 50' },
                  { key: 'last100', label: 'Last 100' },
                  { key: 'last200', label: 'Last 200' },
                  { key: 'first100', label: 'First 100' },
                  { key: 'last7d', label: 'Last 7 Days' },
                  { key: 'last30d', label: 'Last 30 Days' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key as RangePreset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      preset === p.key
                        ? 'bg-stone-100 text-stone-900 font-bold shadow'
                        : 'bg-stone-900/60 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-700/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Controls Based on Selected Mode */}
            {rangeMode === 'solveIndex' && (
              <div className="bg-stone-900/80 border border-stone-700/50 rounded-lg p-3 space-y-3">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* Start Solve Input & Slider */}
                  <div className="flex-1 w-full flex items-center gap-2 min-w-0">
                    <span className="text-stone-400 shrink-0 font-mono text-[11px]">From Solve #:</span>
                    <input
                      type="number"
                      min={1}
                      max={endSolve}
                      value={startSolve}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setStartSolve(Math.max(1, Math.min(val, endSolve)));
                        setPreset('custom');
                      }}
                      className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 font-mono text-center text-stone-100 text-xs focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="range"
                      min={1}
                      max={totalCount}
                      value={startSolve}
                      style={{ touchAction: 'pan-x' }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val <= endSolve) {
                          setStartSolve(val);
                          setPreset('custom');
                        }
                      }}
                      className="accent-sky-400 flex-1 h-2 sm:h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* End Solve Input & Slider */}
                  <div className="flex-1 w-full flex items-center gap-2 min-w-0">
                    <span className="text-stone-400 shrink-0 font-mono text-[11px]">To Solve #:</span>
                    <input
                      type="number"
                      min={startSolve}
                      max={totalCount}
                      value={endSolve}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || totalCount;
                        setEndSolve(Math.min(totalCount, Math.max(val, startSolve)));
                        setPreset('custom');
                      }}
                      className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 font-mono text-center text-stone-100 text-xs focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="range"
                      min={1}
                      max={totalCount}
                      value={endSolve}
                      style={{ touchAction: 'pan-x' }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= startSolve) {
                          setEndSolve(val);
                          setPreset('custom');
                        }
                      }}
                      className="accent-sky-400 flex-1 h-2 sm:h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {rangeMode === 'dateRange' && (
              <div className="bg-stone-900/80 border border-stone-700/50 rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[11px] shrink-0 font-medium">Start Date:</span>
                    <input
                      type="date"
                      value={startDate}
                      min={earliestDate}
                      max={endDate || latestDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[11px] shrink-0 font-medium">End Date:</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || earliestDate}
                      max={latestDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPreset('custom');
                      }}
                      className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <span className="text-[11px] text-stone-400 italic">
                    (Earliest: {earliestDate} &bull; Latest: {latestDate})
                  </span>
                </div>
              </div>
            )}

            {/* Focused Range Stats Banner */}
            <div className="bg-stone-900/90 border border-stone-700/60 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-stone-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-sans font-medium text-stone-400 text-[11px]">Range Focus:</span>
                <span className="font-bold text-sky-300">
                  {rangeMode === 'dateRange'
                    ? `${startDate || earliestDate} – ${endDate || latestDate}`
                    : `Solves #${startSolve} – #${endSolve}`}
                </span>
                <span className="text-stone-500 text-[11px]">
                  ({rangeStats.count} solves &bull; {rangeStats.pctOfTotal}% of total)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1 text-stone-300">
                  <span className="text-stone-400">Mean:</span>
                  <span className="font-bold text-stone-100">{rangeStats.meanSec}s</span>
                </div>
                <div className="flex items-center gap-1 text-stone-300">
                  <span className="text-stone-400">Best:</span>
                  <span className="font-bold text-emerald-400">{rangeStats.bestSec}s</span>
                </div>
                <div className="flex items-center gap-1 border-l border-stone-700/80 pl-2.5">
                  <span className="text-stone-400">Range Slope:</span>
                  <span className={`font-bold ${filteredRegression.slope <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {filteredRegression.slopeFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-stone-400">Range R²:</span>
                  <span className="text-sky-300 font-semibold">
                    {(filteredRegression.r2 * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHART DISPLAY */}
        <div className="w-full h-[420px] pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />

              {/* Vertical Period Boundaries */}
              {periodBoundaries.map((b, idx) => (
                <ReferenceLine
                  key={idx}
                  x={b.index}
                  stroke="#64748b"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                  label={{
                    value: b.label,
                    position: 'top',
                    fill: '#cbd5e1',
                    fontSize: 11,
                    fontWeight: 600,
                    offset: 8,
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
                  name={`Range Trend (${filteredRegression.slopeFormatted})`}
                  stroke="#e11d48"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCardWrapper>
  );
};


