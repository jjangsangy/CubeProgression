import { expect, test } from '@playwright/test';

test.describe('Progression & Personal Best Progression Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible({ timeout: 15000 });
  });

  test.describe('ProgressionChart', () => {
    test('toggles rolling average lines and reflects in the chart legend', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });

      // Ensure legends are rendered
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '5-Solve Moving Average (Ao5)' }),
      ).toBeVisible();
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '12-Solve Moving Average (Ao12)' }),
      ).toBeVisible();

      // Toggle Ao5 off in the card toolbar
      const ao5Btn = card.getByRole('button', { name: 'Ao5', exact: true });
      await ao5Btn.click();
      await expect(ao5Btn).not.toHaveClass(/bg-emerald-500\/20/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '5-Solve Moving Average (Ao5)' }),
      ).toHaveCount(0);

      // Toggle Trend off
      const trendBtn = card.getByRole('button', { name: 'Trend', exact: true });
      await trendBtn.click();
      await expect(trendBtn).not.toHaveClass(/bg-rose-500\/20/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: /Range Trend/ }),
      ).toHaveCount(0);

      // Toggle Ao5 back on
      await ao5Btn.click();
      await expect(ao5Btn).toHaveClass(/bg-emerald-500\/20/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '5-Solve Moving Average (Ao5)' }),
      ).toBeVisible();
    });

    test('activates Custom Ao, modifies N window, and updates legend text', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });

      const customAoBtn = card.getByRole('button', { name: /Custom Ao/i });
      await customAoBtn.click();

      // Number input appears with default value 25
      const spinInput = card.getByRole('spinbutton');
      await expect(spinInput).toBeVisible();
      await expect(spinInput).toHaveValue('25');
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '25-Solve Moving Average (Ao25)' }),
      ).toBeVisible();

      // Update to custom Ao 30
      await spinInput.fill('30');
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '30-Solve Moving Average (Ao30)' }),
      ).toBeVisible();
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '25-Solve Moving Average (Ao25)' }),
      ).toHaveCount(0);
    });

    test('switches solve visibility modes (Muted, Hidden, Unmuted)', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });

      const mutedBtn = card.getByRole('button', { name: 'Muted', exact: true });
      const hiddenBtn = card.getByRole('button', { name: 'Hidden', exact: true });
      const unmutedBtn = card.getByRole('button', { name: 'Unmuted', exact: true });

      // Default is Muted
      await expect(mutedBtn).toHaveClass(/bg-stone-700/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'Single Solve Time' }),
      ).toBeVisible();

      // Switch to Hidden mode
      await hiddenBtn.click();
      await expect(hiddenBtn).toHaveClass(/bg-stone-700/);
      await expect(mutedBtn).not.toHaveClass(/bg-stone-700/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'Single Solve Time' }),
      ).toHaveCount(0);

      // Switch to Unmuted mode
      await unmutedBtn.click();
      await expect(unmutedBtn).toHaveClass(/bg-stone-700/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'Single Solve Time' }),
      ).toBeVisible();
    });

    test('applies range presets, updates focused range stats, and resets range', async ({
      page,
    }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });

      // Initial stats banner shows 350 total solves (Range Selector panel is open by default)
      await expect(card.getByText(/350 solves • 100\.0% of total/)).toBeVisible();

      // Click Last 50 preset
      const last50Btn = card.getByRole('button', { name: 'Last 50' });
      await last50Btn.click();
      await expect(last50Btn).toHaveClass(/bg-stone-100/);

      // Banner reflects 50 solves
      await expect(card.getByText(/50 solves • 14\.3% of total/)).toBeVisible();

      // Reset Range button appears with count
      const resetBtn = card.getByRole('button', { name: /Reset Range/i });
      await expect(resetBtn).toBeVisible();

      // Click Reset Range
      await resetBtn.click();
      await expect(card.getByText(/350 solves • 100\.0% of total/)).toBeVisible();
    });

    test('switches range mode to Date Range and renders date picker inputs', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });

      // Switch to Date Range mode
      const dateRangeBtn = card.getByRole('button', { name: 'Date Range' });
      await expect(dateRangeBtn).toBeVisible();
      await dateRangeBtn.click();
      await expect(dateRangeBtn).toHaveClass(/bg-sky-500/);

      // Verify date inputs are displayed
      const dateInputs = card.locator('input[type="date"]');
      await expect(dateInputs).toHaveCount(2);
      await expect(card.getByText('Start Date:')).toBeVisible();
      await expect(card.getByText('End Date:')).toBeVisible();
    });
  });

  test.describe('PbProgressionChart', () => {
    test('renders top PB summary stat cards with valid records', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /PB Progression Over Time/i }),
      });

      const summaryGrid = card.locator('.grid.grid-cols-2');
      await expect(summaryGrid.getByText('PB Single', { exact: true })).toBeVisible();
      await expect(summaryGrid.getByText('PB Ao5', { exact: true })).toBeVisible();
      await expect(summaryGrid.getByText('PB Ao12', { exact: true })).toBeVisible();
      await expect(summaryGrid.getByText('PB Ao50', { exact: true })).toBeVisible();
      await expect(summaryGrid.getByText('PB Ao100', { exact: true })).toBeVisible();

      // Records break badges display count
      await expect(summaryGrid.getByText(/\d+ set/i).first()).toBeVisible();
    });

    test('toggles PB record curves and raw solves overlay in legend', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /PB Progression Over Time/i }),
      });

      // Solves Overlay is off by default
      const overlayBtn = card.getByRole('button', { name: /Solves Overlay/i });
      await expect(overlayBtn).not.toHaveClass(/bg-stone-700/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'Individual Solve Time' }),
      ).toHaveCount(0);

      // Toggle Solves Overlay on
      await overlayBtn.click();
      await expect(overlayBtn).toHaveClass(/bg-stone-700/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'Individual Solve Time' }),
      ).toBeVisible();

      // Toggle Single PB curve off
      const singleBtn = card.getByRole('button', { name: 'Single', exact: true });
      await singleBtn.click();
      await expect(singleBtn).not.toHaveClass(/bg-amber-500\/20/);
      await expect(
        card.locator('.recharts-legend-item-text', { hasText: 'PB Single' }),
      ).toHaveCount(0);
    });

    test('expands milestone history drawer, filters by record type, and collapses', async ({
      page,
    }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /PB Progression Over Time/i }),
      });

      const drawerBtn = card.getByRole('button', { name: /Record Milestones History/i });
      await drawerBtn.click();

      // Drawer container is now visible
      const drawer = card.locator('.fade-in', { hasText: 'Filter Record Type:' });
      await expect(drawer).toBeVisible();

      // Filter by Single milestones
      const singleFilter = drawer.getByRole('button', { name: 'Single', exact: true });
      await singleFilter.click();
      await expect(singleFilter).toHaveClass(/bg-amber-500\/20/);

      // All milestone cards in the drawer show PB Single
      const badges = drawer.locator('span', { hasText: /^PB / });
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(badges.nth(i)).toHaveText('PB Single');
      }

      // Close the drawer
      await drawerBtn.click();
      await expect(drawer).toHaveCount(0);
    });
  });
});
