import type React from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { calculateLinearRegression, getPeriodUnitInfo } from '../../utils/statsMath';
import { ChartCardWrapper } from '../ChartCardWrapper';
import { ProgressionMetricToggles } from './ProgressionMetricToggles';
import { ProgressionRangeControls } from './ProgressionRangeControls';
import {
  buildProgressionChartData,
  buildSolvePeriodMap,
  calculateProgressionYDomain,
  computeRawPeriodBoundaries,
  downsampleBoundaryTicks,
  getSingleLineStyle,
} from './progressionMath';
import type { ProgressionChartProps, SolveVisibilityMode } from './types';
import { useProgressionRange } from './useProgressionRange';

const ProgressionChartCanvas = lazy(() =>
  import('./ProgressionChartCanvas').then((m) => ({ default: m.ProgressionChartCanvas })),
);

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  solves,
  periodGroups,
  regression: _regression,
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

  const [isRangePanelOpen, setIsRangePanelOpen] = useState<boolean>(true);

  // Defer expensive Recharts SVG canvas mounting to browser idle time (keeps initial paint blocking time <30ms)
  const [canRenderCanvas, setCanRenderCanvas] = useState(() => {
    return typeof window === 'undefined' || !('requestIdleCallback' in window);
  });

  useEffect(() => {
    if (canRenderCanvas) return;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => setCanRenderCanvas(true), {
        timeout: 1200,
      });
      return () => window.cancelIdleCallback(handle);
    }

    const timer = setTimeout(() => setCanRenderCanvas(true), 250);
    return () => clearTimeout(timer);
  }, [canRenderCanvas]);

  // Viewport width tracking for responsive tick calculations
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsMobileScreen(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const unitInfo = getPeriodUnitInfo(groupingPeriod);

  const {
    rangeMode,
    setRangeMode,
    preset,
    setPreset,
    startSolve,
    setStartSolve,
    endSolve,
    setEndSolve,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    earliestDate,
    latestDate,
    totalCount,
    applyPreset,
    filteredSolves,
    rangeStats,
  } = useProgressionRange(solves);

  // Re-estimate OLS Linear Regression for the filtered range
  const filteredRegression = useMemo(
    () => calculateLinearRegression(filteredSolves),
    [filteredSolves],
  );

  // Map solve index to period group info for hover tooltips
  const solvePeriodMap = useMemo(
    () => buildSolvePeriodMap(periodGroups, unitInfo.unitSingular),
    [periodGroups, unitInfo.unitSingular],
  );

  // Construct chart data for filtered range
  const chartData = useMemo(
    () =>
      buildProgressionChartData(
        filteredSolves,
        solves,
        filteredRegression,
        solvePeriodMap,
        showCustomAo,
        customAoN,
      ),
    [filteredSolves, solves, filteredRegression, solvePeriodMap, showCustomAo, customAoN],
  );

  // Raw period boundaries matching the filtered solves range
  const rawPeriodBoundaries = useMemo(
    () => computeRawPeriodBoundaries(periodGroups, filteredSolves, unitInfo.unitSingular),
    [periodGroups, filteredSolves, unitInfo.unitSingular],
  );

  // Responsive tick calculation for vertical period boundary labels
  const responsiveBoundaryInfo = useMemo(
    () => downsampleBoundaryTicks(rawPeriodBoundaries, windowWidth),
    [rawPeriodBoundaries, windowWidth],
  );

  // Y domain with padding based on active visible metrics in filtered dataset
  const { minY, maxY } = useMemo(
    () =>
      calculateProgressionYDomain(chartData, {
        solveVisibility,
        showAo5,
        showAo12,
        showAo50,
        showAo100,
        showCustomAo,
        showTrend,
      }),
    [chartData, solveVisibility, showAo5, showAo12, showAo50, showAo100, showCustomAo, showTrend],
  );

  const singleLineStyle = getSingleLineStyle(solveVisibility);

  const canvasSkeleton = (
    <div
      className="flex h-[420px] w-full flex-col justify-between rounded-xl border border-stone-800/60 bg-stone-900/40 p-6 animate-pulse"
      data-testid="progression-canvas-skeleton"
    >
      <div className="flex items-center justify-between opacity-50">
        <div className="h-4 w-32 rounded bg-stone-800" />
        <div className="h-4 w-24 rounded bg-stone-800" />
      </div>
      <div className="my-auto flex flex-col items-center justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
        <span className="text-xs text-stone-500 font-medium">Preparing progression plot...</span>
      </div>
      <div className="h-3 w-48 rounded bg-stone-800/40 opacity-40" />
    </div>
  );

  return (
    <ChartCardWrapper
      title={title}
      subtitle="Individual solve plot with interactive range selector, toggleable moving averages (Ao5, Ao12, Ao50, Ao100, Custom N), and OLS regression."
      mobileSubtitle="Individual solve plot with range filter and moving averages."
      headerBadge={<span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400"></span>}
      filenamePrefix="progression_moving_averages"
      headerControls={
        <ProgressionMetricToggles
          showAo5={showAo5}
          onToggleAo5={() => setShowAo5(!showAo5)}
          showAo12={showAo12}
          onToggleAo12={() => setShowAo12(!showAo12)}
          showAo50={showAo50}
          onToggleAo50={() => setShowAo50(!showAo50)}
          showAo100={showAo100}
          onToggleAo100={() => setShowAo100(!showAo100)}
          showTrend={showTrend}
          onToggleTrend={() => setShowTrend(!showTrend)}
          showCustomAo={showCustomAo}
          onToggleCustomAo={() => setShowCustomAo(!showCustomAo)}
          customAoN={customAoN}
          onChangeCustomAoN={setCustomAoN}
          solveVisibility={solveVisibility}
          onChangeSolveVisibility={setSolveVisibility}
          isRangePanelOpen={isRangePanelOpen}
          isFiltered={rangeStats.isFiltered}
          onToggleRangePanel={() => setIsRangePanelOpen(!isRangePanelOpen)}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* RANGE SELECTOR PANEL */}
        <ProgressionRangeControls
          isOpen={isRangePanelOpen}
          rangeMode={rangeMode}
          onModeChange={setRangeMode}
          preset={preset}
          onApplyPreset={applyPreset}
          startSolve={startSolve}
          endSolve={endSolve}
          totalCount={totalCount}
          onStartSolveChange={(val) => {
            setStartSolve(val);
            setPreset('custom');
          }}
          onEndSolveChange={(val) => {
            setEndSolve(val);
            setPreset('custom');
          }}
          startDate={startDate}
          endDate={endDate}
          earliestDate={earliestDate}
          latestDate={latestDate}
          onStartDateChange={(date) => {
            setStartDate(date);
            setPreset('custom');
          }}
          onEndDateChange={(date) => {
            setEndDate(date);
            setPreset('custom');
          }}
          rangeStats={{
            ...rangeStats,
            slope: filteredRegression.slope,
            slopeFormatted: filteredRegression.slopeFormatted,
            r2: filteredRegression.r2,
          }}
          filteredRegression={filteredRegression}
          onResetRange={() => applyPreset('all')}
        />

        {/* CHART DISPLAY */}
        {canRenderCanvas ? (
          <Suspense fallback={canvasSkeleton}>
            <ProgressionChartCanvas
              chartData={chartData}
              minY={minY}
              maxY={maxY}
              isMobileScreen={isMobileScreen}
              responsiveBoundaryInfo={responsiveBoundaryInfo}
              singleLineStyle={singleLineStyle}
              solveVisibility={solveVisibility}
              showAo5={showAo5}
              showAo12={showAo12}
              showAo50={showAo50}
              showAo100={showAo100}
              showCustomAo={showCustomAo}
              customAoN={customAoN}
              showTrend={showTrend}
              slopeFormatted={filteredRegression.slopeFormatted}
            />
          </Suspense>
        ) : (
          canvasSkeleton
        )}
      </div>
    </ChartCardWrapper>
  );
};
