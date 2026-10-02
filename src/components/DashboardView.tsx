import type { GlobalStats, GroupingPeriod, PeriodGroup, Session } from '../types';
import { DailyDistributionBoxPlot } from './DailyDistributionBoxPlot';
import { DensityShiftChart } from './DensityShiftChart';
import { MetricsEvolutionChart } from './MetricsEvolutionChart';
import { MetricsOverviewCards } from './MetricsOverviewCards';
import { PbProgressionChart } from './PbProgressionChart';
import { ProgressionChart } from './ProgressionChart';
import { SolvesTable } from './SolvesTable';

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
        <ProgressionChart
          solves={session.solves}
          periodGroups={periodGroups}
          regression={stats.regression}
          groupingPeriod={groupingPeriod}
          title={`${session.name}: Progression Over ${session.solves.length} Solves`}
        />

        {/* Plot 2: Personal Best Progression Over Time */}
        <PbProgressionChart
          solves={session.solves}
          groupingPeriod={groupingPeriod}
          title={`${session.name}: PB Progression Over Time`}
        />

        {/* Plot 3: Solve Time Distribution & Variance */}
        <DailyDistributionBoxPlot periodGroups={periodGroups} groupingPeriod={groupingPeriod} />

        {/* Grid for Plot 3 & Plot 4 */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Plot 3: Distribution Density Shift */}
          <DensityShiftChart
            solves={session.solves}
            groupingPeriod={groupingPeriod}
            title="Time Distribution Shift: Baseline vs. Recent Solves"
          />

          {/* Plot 4: Metrics Summary / Evolution */}
          <MetricsEvolutionChart periodGroups={periodGroups} groupingPeriod={groupingPeriod} />
        </div>

        {/* Detailed Solve Log Table */}
        <SolvesTable solves={session.solves} />
      </div>
    </>
  );
}
