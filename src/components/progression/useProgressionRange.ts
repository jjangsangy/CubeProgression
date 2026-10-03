import { useEffect, useState } from 'react';
import type { Solve } from '../../types';
import { calculateRangeStats, filterSolvesByRange } from './progressionMath';
import type { RangeMode, RangePreset } from './types';

export function useProgressionRange(solves: Solve[]) {
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [startSolve, setStartSolve] = useState<number>(1);
  const [endSolve, setEndSolve] = useState<number>(solves.length || 1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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
  }, [solves, startDate, preset, endDate]);

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
      const lastTs =
        solves[solves.length - 1]?.timestamp ?? Temporal.Now.instant().epochMilliseconds;
      const lastZdt = Temporal.Instant.fromEpochMilliseconds(lastTs).toZonedDateTimeISO(
        Temporal.Now.timeZoneId(),
      );
      const targetStr = lastZdt.subtract({ days: 7 }).toPlainDate().toString();
      setStartDate(targetStr > earliestDate ? targetStr : earliestDate);
      setEndDate(latestDate);
    } else if (selectedPreset === 'last30d') {
      setRangeMode('dateRange');
      const lastTs =
        solves[solves.length - 1]?.timestamp ?? Temporal.Now.instant().epochMilliseconds;
      const lastZdt = Temporal.Instant.fromEpochMilliseconds(lastTs).toZonedDateTimeISO(
        Temporal.Now.timeZoneId(),
      );
      const targetStr = lastZdt.subtract({ days: 30 }).toPlainDate().toString();
      setStartDate(targetStr > earliestDate ? targetStr : earliestDate);
      setEndDate(latestDate);
    }
  };

  const filteredSolves = filterSolvesByRange(
    solves,
    rangeMode,
    startSolve,
    endSolve,
    startDate,
    endDate,
  );

  const rangeStats = calculateRangeStats(filteredSolves, totalCount);

  return {
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
  };
}
