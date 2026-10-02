import { lazy } from 'react';
import type { GlobalStats, GroupingPeriod, PeriodGroup, Session } from '../types';
import { DailyDistributionBoxPlot } from './DailyDistributionBoxPlot';
import { DeferredChart } from './DeferredChart';
import { MetricsOverviewCards } from './MetricsOverviewCards';
import { SolvesTable } from './SolvesTable';

const ProgressionChart = lazy(() =>
  import('./ProgressionChart').then((m) => ({ default: m.ProgressionChart })),
);
const PbProgressionChart = lazy(() =>
  import('./PbProgressionChart').then((m) => ({ default: m.PbProgressionChart })),
);
const DensityShiftChart = lazy(() =>
  import('./DensityShiftChart').then((m) => ({ default: m.DensityShiftChart })),
);
const MetricsEvolutionChart = lazy(() =>
  import('./MetricsEvolutionChart').then((m) => ({ default: m.MetricsEvolutionChart })),
);

export interface DashboardViewProps {
  session: Session | null;
  stats: GlobalStats | null;
  periodGroups: PeriodGroup[];
  groupingPeriod: GroupingPeriod;
}

export function DashboardView({
  session,
  stats,
  periodGroups,
  groupingPeriod,
}: DashboardViewProps) {
  if (!session || !stats) {
    return null;
  }

  return (
    <>
      {/* Global Summary Metric Cards */}
      <MetricsOverviewCards stats={stats} sessionName={session.name} />

      {/* The 4 Progression Plots & Solves Table */}
      <div className="flex flex-col gap-8">
        {/* Plot 1: Overall Progression & Moving Averages */}
        <DeferredChart minHeight={480} fallbackTitle="Overall Progression">
          <ProgressionChart
            solves={session.solves}
            periodGroups={periodGroups}
            regression={stats.regression}
            groupingPeriod={groupingPeriod}
            title={`${session.name}: Progression Over ${session.solves.length} Solves`}
          />
        </DeferredChart>

        {/* Plot 2: Personal Best Progression Over Time */}
        <DeferredChart minHeight={540} fallbackTitle="PB Progression">
          <PbProgressionChart
            solves={session.solves}
            groupingPeriod={groupingPeriod}
            title={`${session.name}: PB Progression Over Time`}
          />
        </DeferredChart>

        {/* Plot 3: Solve Time Distribution & Variance */}
        <DeferredChart minHeight={500} fallbackTitle="Solve Time Distribution">
          <DailyDistributionBoxPlot periodGroups={periodGroups} groupingPeriod={groupingPeriod} />
        </DeferredChart>

        {/* Grid for Plot 4 & Plot 5 */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Plot 4: Distribution Density Shift */}
          <DeferredChart minHeight={460} fallbackTitle="Density Shift">
            <DensityShiftChart
              solves={session.solves}
              groupingPeriod={groupingPeriod}
              title="Time Distribution Shift: Baseline vs. Recent Solves"
            />
          </DeferredChart>

          {/* Plot 5: Metrics Summary / Evolution */}
          <DeferredChart minHeight={460} fallbackTitle="Metrics Evolution">
            <MetricsEvolutionChart periodGroups={periodGroups} groupingPeriod={groupingPeriod} />
          </DeferredChart>
        </div>

        {/* Detailed Solve Log Table */}
        <DeferredChart minHeight={600} fallbackTitle="Solves Table">
          <SolvesTable solves={session.solves} />
        </DeferredChart>
      </div>
    </>
  );
}

export default DashboardView;
