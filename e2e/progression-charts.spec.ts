import { expect, test } from '@playwright/test';

test.describe('Progression & Personal Best Progression Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#progression-chart')).toBeVisible({ timeout: 15000 });
  });

  test.describe('ProgressionChart', () => {
    test('toggles rolling average lines and reflects in the chart legend', async ({ page }) => {
      const card = page.locator('#progression-chart');
      const legendCount = () => card.locator('.recharts-legend-item-text').count();

      // The Recharts canvas mounts on idle; wait for its legend before sampling.
      await expect.poll(legendCount).toBeGreaterThan(0);
      const initialCount = await legendCount();
      expect(initialCount).toBeGreaterThanOrEqual(3);

      // Toggling Ao5 off removes exactly one legend series.
      const ao5Btn = card.locator('#progression-ao5');
      await ao5Btn.click();
      await expect(ao5Btn).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(legendCount).toBe(initialCount - 1);

      // Toggling Trend off removes another series.
      const trendBtn = card.locator('#progression-trend');
      await trendBtn.click();
      await expect(trendBtn).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(legendCount).toBe(initialCount - 2);

      // Toggling Ao5 back on restores exactly that series.
      await ao5Btn.click();
      await expect(ao5Btn).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(legendCount).toBe(initialCount - 1);
    });

    test('activates a Custom Ao moving average and updates its window', async ({ page }) => {
      const card = page.locator('#progression-chart');
      const legendCount = () => card.locator('.recharts-legend-item-text').count();

      await expect.poll(legendCount).toBeGreaterThan(0);
      const initialCount = await legendCount();

      const customAoBtn = card.locator('#progression-custom-ao');
      await expect(customAoBtn).toHaveAttribute('aria-pressed', 'false');
      await customAoBtn.click();

      // Enabling adds one custom moving-average series.
      const spinInput = card.locator('#progression-custom-ao-input');
      await expect(spinInput).toBeVisible();
      await expect(spinInput).toHaveValue('25');
      await expect(customAoBtn).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(legendCount).toBe(initialCount + 1);

      // Changing the window keeps a single custom series; the value is the contract.
      await spinInput.fill('30');
      await expect(spinInput).toHaveValue('30');
      await expect.poll(legendCount).toBe(initialCount + 1);
    });

    test('switches solve visibility modes (Muted, Hidden, Unmuted)', async ({ page }) => {
      const card = page.locator('#progression-chart');
      const legendCount = () => card.locator('.recharts-legend-item-text').count();

      const mutedBtn = card.locator('#progression-muted');
      const hiddenBtn = card.locator('#progression-hidden');
      const unmutedBtn = card.locator('#progression-unmuted');

      // Default is Muted, which renders the single-solve series.
      await expect(mutedBtn).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(legendCount).toBeGreaterThan(0);
      const visibleCount = await legendCount();

      // Hidden drops the single-solve series from the legend.
      await hiddenBtn.click();
      await expect(hiddenBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(mutedBtn).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(legendCount).toBe(visibleCount - 1);

      // Unmuted restores it.
      await unmutedBtn.click();
      await expect(unmutedBtn).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(legendCount).toBe(visibleCount);
    });

    test('applies range presets, updates focused range stats, and resets range', async ({
      page,
    }) => {
      const card = page.locator('#progression-chart');
      const rangeStats = card.locator('#range-stats');
      const rangeStatsText = () => rangeStats.textContent();

      // Initial stats banner shows all 350 demo solves (Range Selector panel is open by default)
      await expect.poll(async () => (await rangeStatsText()) ?? '').toMatch(/\b350\b/);

      // Click Last 50 preset
      const last50Btn = card.locator('#range-preset-last50');
      await expect(last50Btn).toBeVisible();
      await last50Btn.click();
      await expect(last50Btn).toHaveAttribute('aria-pressed', 'true');

      // Banner reflects 50 solves
      await expect.poll(async () => (await rangeStatsText()) ?? '').toMatch(/\b50\b/);

      // Reset Range button appears with count
      const resetBtn = card.locator('#progression-reset-range');
      await expect(resetBtn).toBeVisible();

      // Click Reset Range
      await resetBtn.click();
      await expect.poll(async () => (await rangeStatsText()) ?? '').toMatch(/\b350\b/);
    });

    test('switches range mode to Date Range and renders date picker inputs', async ({ page }) => {
      const card = page.locator('#progression-chart');

      // Switch to Date Range mode
      const dateRangeBtn = card.locator('#progression-date-range');
      await expect(dateRangeBtn).toBeVisible();
      await dateRangeBtn.click();
      await expect(dateRangeBtn).toHaveAttribute('aria-pressed', 'true');

      // Verify date inputs are displayed
      const dateInputs = card.locator('input[type="date"]');
      await expect(dateInputs).toHaveCount(2);
      await expect(card.locator('#progression-start-date')).toBeVisible();
      await expect(card.locator('#progression-end-date')).toBeVisible();
    });
  });

  test.describe('PbProgressionChart', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('#deferred-pb-progression').scrollIntoViewIfNeeded();
      await expect(page.locator('#pb-progression-chart')).toBeVisible({
        timeout: 10000,
      });
    });

    test('renders top PB summary stat cards with valid records', async ({ page }) => {
      const card = page.locator('#pb-progression-chart');

      const summaryGrid = card.locator('.grid.grid-cols-2');
      await expect(summaryGrid.locator('> div')).toHaveCount(5);

      // Records break badges display a per-record count
      await expect.poll(async () => (await summaryGrid.textContent()) ?? '').toMatch(/\d+ set/i);
    });

    test('toggles PB record curves and raw solves overlay in legend', async ({ page }) => {
      const card = page.locator('#pb-progression-chart');
      const legendCount = () => card.locator('.recharts-legend-item-text').count();

      await expect.poll(legendCount).toBeGreaterThan(0);
      const initialCount = await legendCount();

      // Solves Overlay is off by default; enabling it adds exactly one series.
      const overlayBtn = card.locator('#pb-show-solves-overlay');
      await expect(overlayBtn).toHaveAttribute('aria-pressed', 'false');
      await overlayBtn.click();
      await expect(overlayBtn).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(legendCount).toBe(initialCount + 1);

      // Toggling the Single PB curve off removes exactly one series.
      const singleBtn = card.locator('#pb-show-single');
      await singleBtn.click();
      await expect(singleBtn).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(legendCount).toBe(initialCount);
    });

    test('expands milestone history drawer, filters by record type, and collapses', async ({
      page,
    }) => {
      const card = page.locator('#pb-progression-chart');

      const drawerBtn = card.locator('#pb-milestones-history-toggle');
      await drawerBtn.click();

      // Drawer container is now visible
      const drawer = card.locator('.fade-in');
      await expect(drawer).toBeVisible();

      const allMilestoneCount = await drawer.locator('.custom-scrollbar > div').count();
      expect(allMilestoneCount).toBeGreaterThan(0);

      // Filter by Single milestones
      const singleFilter = card.locator('#pb-milestone-filter-Single');
      await singleFilter.click();
      await expect(singleFilter).toHaveAttribute('aria-pressed', 'true');

      // The filter narrows the list to a non-empty subset of the unfiltered rows.
      const milestoneRows = drawer.locator('.custom-scrollbar > div');
      await expect.poll(() => milestoneRows.count()).toBeLessThan(allMilestoneCount);
      expect(await milestoneRows.count()).toBeGreaterThan(0);

      // Close the drawer
      await drawerBtn.click();
      await expect(drawer).toHaveCount(0);
    });
  });
});
