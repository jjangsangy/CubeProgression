import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getTheme } from '../theme';
import { ThemeProvider } from '../theme/ThemeContext';
import type { GlobalStats } from '../types';
import { MetricsOverviewCards } from './MetricsOverviewCards';

const mockGlobalStats: GlobalStats = {
  totalSolves: 100,
  dnfCount: 2,
  bestSingle: {
    id: 1,
    index: 1,
    timeMs: 8500,
    rawTimeSec: 8.5,
    finalTimeSec: 8.5,
    penalty: 'OK',
    timestamp: 1600000000000,
    date: Temporal.PlainDate.from('2020-09-13'),
    dateStr: '2020-09-13',
  },
  worstSingle: null,
  bestAo5: 10.2,
  bestAo12: 11.4,
  bestAo50: 12.1,
  currentAo5: 10.8,
  currentAo12: 11.6,
  overallMean: 12.5,
  overallMedian: 12.2,
  regression: {
    slope: -0.015,
    intercept: 14.2,
    r2: 0.65,
    slopeFormatted: '-0.0150s/solve',
  },
  initialAvg: 14.5,
  recentAvg: 11.2,
  improvementSec: 3.3,
  improvementPct: 22.8,
};

// Anchor on the card region id; fails loudly if the region is missing.
const getCard = (container: HTMLElement, id: string): HTMLElement => {
  const card = container.querySelector(`#${id}`);
  expect(card).not.toBeNull();
  return card as HTMLElement;
};

// Locate a leaf node that displays an app-computed value (never decorative copy).
const findValueNode = (root: HTMLElement, value: string): Element | null =>
  Array.from(root.querySelectorAll('div, span')).find(
    (el) => el.children.length === 0 && el.textContent === value,
  ) ?? null;

describe('MetricsOverviewCards component', () => {
  it('renders summary cards with formatted metrics', () => {
    const { container } = render(
      <MetricsOverviewCards stats={mockGlobalStats} sessionName="3x3 Session" />,
    );

    expect(getCard(container, 'metric-best-single').textContent).toContain('8.50s');

    const averages = getCard(container, 'metric-best-averages');
    expect(averages.textContent).toContain('11.40s'); // Ao12
    expect(averages.textContent).toContain('12.10s'); // Ao50

    expect(getCard(container, 'metric-overall-rate').textContent).toContain('-0.0150s/solve');
    expect(getCard(container, 'metric-progression-gain').textContent).toContain('-3.3s');

    const solves = getCard(container, 'metric-session-solves');
    // Assert the specific count node so a value like 1000 cannot satisfy it
    const solvesCount = solves.querySelector('div.font-mono');
    expect(solvesCount).not.toBeNull();
    expect(solvesCount?.textContent).toBe('100 solves');
    expect(solves.textContent).toContain('2 DNFs');
  });

  it('renders fallback placeholders when metrics are absent or negative', () => {
    const minimalStats: GlobalStats = {
      totalSolves: 10,
      dnfCount: 0,
      bestSingle: null,
      worstSingle: null,
      bestAo5: null,
      bestAo12: null,
      bestAo50: null,
      currentAo5: null,
      currentAo12: null,
      overallMean: 15.0,
      overallMedian: 15.0,
      regression: {
        slope: 0.01,
        intercept: 15.0,
        r2: 0.05,
        slopeFormatted: '+0.0100s/solve',
      },
      initialAvg: 14.0,
      recentAvg: 16.0,
      improvementSec: -2.0,
      improvementPct: -14.3,
    };

    const { container } = render(
      <MetricsOverviewCards stats={minimalStats} sessionName="Empty Session" />,
    );

    const bestSingle = getCard(container, 'metric-best-single');
    expect(bestSingle.textContent).toContain('N/A');
    expect(bestSingle.textContent).toContain('No valid solves');

    const averages = getCard(container, 'metric-best-averages');
    expect((averages.textContent?.match(/—/g) ?? []).length).toBe(2); // Ao12 & Ao50

    // Slower recent average (improvementSec < 0) must read as a positive time increase
    const gain = getCard(container, 'metric-progression-gain');
    expect(gain.textContent).toContain('+2s');
    expect(gain.textContent).not.toContain('-2s');
    expect(gain.textContent).toContain('(-14.3%)');

    expect(getCard(container, 'metric-session-solves').textContent).toContain('0 DNFs');
  });

  it('renders a zero progression change without a misleading sign', () => {
    const { container } = render(
      <MetricsOverviewCards
        stats={{ ...mockGlobalStats, improvementSec: 0, improvementPct: 0 }}
        sessionName="Flat Session"
      />,
    );

    const gain = getCard(container, 'metric-progression-gain');
    expect(gain.textContent).toContain('0s');
    expect(gain.textContent).toContain('(0%)');
  });

  it('renders with responsive grid classes and symmetrical 5th card span on 2-column viewports', () => {
    const { container } = render(
      <MetricsOverviewCards stats={mockGlobalStats} sessionName="Grid Test" />,
    );

    const grid = container.querySelector('#metrics-overview') as HTMLElement;
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-5');

    const cards = grid.children;
    expect(cards).toHaveLength(5);
    const fifthCard = cards[4];
    expect(fifthCard).toHaveClass('sm:col-span-2');
    expect(fifthCard).toHaveClass('lg:col-span-1');
  });

  it('applies emerald color for negative/improving slope and rose color for positive/slowing slope', () => {
    const improvingStats = {
      ...mockGlobalStats,
      regression: { ...mockGlobalStats.regression, slope: -0.02, slopeFormatted: '-0.0200s/solve' },
      improvementPct: 15.5,
    };
    const { container, rerender } = render(
      <MetricsOverviewCards stats={improvingStats} sessionName="Fast" />,
    );
    expect(findValueNode(getCard(container, 'metric-overall-rate'), '-0.0200s/solve')).toHaveClass(
      'text-emerald-400',
    );
    expect(findValueNode(getCard(container, 'metric-progression-gain'), '(+15.5%)')).toHaveClass(
      'text-emerald-400',
    );

    const degradingStats = {
      ...mockGlobalStats,
      regression: { ...mockGlobalStats.regression, slope: 0.03, slopeFormatted: '+0.0300s/solve' },
      improvementSec: -1.5,
      improvementPct: -8.2,
    };
    rerender(<MetricsOverviewCards stats={degradingStats} sessionName="Slow" />);
    expect(findValueNode(getCard(container, 'metric-overall-rate'), '+0.0300s/solve')).toHaveClass(
      'text-rose-400',
    );
    expect(findValueNode(getCard(container, 'metric-progression-gain'), '(-8.2%)')).toHaveClass(
      'text-rose-400',
    );
  });

  it('renders distinct series colors for all five card icon badges without duplicates across themes', () => {
    const cardIds = [
      'metric-best-single',
      'metric-best-averages',
      'metric-overall-rate',
      'metric-progression-gain',
      'metric-session-solves',
    ];

    const testThemes = ['dark', 'gan-mint', 'cyberpunk', 'light'] as const;

    for (const themeId of testThemes) {
      const theme = getTheme(themeId);
      const { container } = render(
        <ThemeProvider initialTheme={themeId}>
          <MetricsOverviewCards stats={mockGlobalStats} sessionName="Theme Test" />
        </ThemeProvider>,
      );

      const expectedColors = [
        theme.colors.series.amber,
        theme.colors.series.blue,
        theme.colors.series.red,
        theme.colors.series.green,
        theme.colors.series.purple,
      ];

      const colorsFound: string[] = [];

      for (let i = 0; i < cardIds.length; i++) {
        const card = getCard(container, cardIds[i]);
        const iconBadge = card.querySelector('svg')?.parentElement;
        expect(iconBadge).not.toBeNull();
        expect(iconBadge).toHaveStyle({ color: expectedColors[i] });
        colorsFound.push(iconBadge?.style.color ?? '');
      }

      // Ensure every icon badge has a unique color
      const uniqueColors = new Set(colorsFound);
      expect(uniqueColors.size).toBe(5);
    }
  });
});
