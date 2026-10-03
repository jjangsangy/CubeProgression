import { Timer } from 'lucide-react';
import type React from 'react';
import { memo, useEffect, useState } from 'react';

export interface LoadingElapsedTimerProps {
  /**
   * Update cadence in milliseconds. Defaults to 250ms (4 fps)
   * to slash CPU timer interrupts by ~86% while maintaining a smooth visual counter.
   */
  intervalMs?: number;
  /**
   * Optional initial timestamp (ms) to synchronize with external start times.
   */
  initialStartTime?: number;
}

export const LoadingElapsedTimer: React.FC<LoadingElapsedTimerProps> = memo(
  ({ intervalMs = 250, initialStartTime }) => {
    const [elapsed, setElapsed] = useState<number>(0);

    useEffect(() => {
      const startTime = initialStartTime ?? Temporal.Now.instant().epochMilliseconds;
      setElapsed((Temporal.Now.instant().epochMilliseconds - startTime) / 1000);

      const interval = setInterval(() => {
        setElapsed((Temporal.Now.instant().epochMilliseconds - startTime) / 1000);
      }, intervalMs);

      return () => {
        clearInterval(interval);
      };
    }, [intervalMs, initialStartTime]);

    return (
      <span className="flex items-center gap-1 font-semibold text-amber-400">
        <Timer className="h-3 w-3 animate-spin text-amber-400" />
        {elapsed.toFixed(2)}s
      </span>
    );
  },
);

LoadingElapsedTimer.displayName = 'LoadingElapsedTimer';
