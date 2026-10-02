import { expect, test } from '@playwright/test';

test.describe('Distribution Charts, Evolution & Chart Card Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Await demo dataset initialization
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test('DensityShiftChart renders centered summary banner, timeline scrubbers, and ribbed resize handles', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
    });

    await expect(densityCard).toBeVisible();

    // Verify statistical summary banner exists and has centered items
    await expect(densityCard.getByText('Baseline Mean:')).toBeVisible();
    await expect(densityCard.getByText('Recent Mean:')).toBeVisible();
    await expect(densityCard.getByText('Distribution Shift:', { exact: true })).toBeVisible();

    // Verify scrubbers track and visual sparkline
    const track = densityCard.getByLabel('Solve distribution timeline scrubbers track');
    await expect(track).toBeVisible();

    const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
    const scrubber2 = densityCard.getByRole('slider', { name: 'Recent scrubber position' });

    await expect(scrubber1).toBeVisible();
    await expect(scrubber2).toBeVisible();
    await expect(scrubber1).toHaveClass(/bg-rose-500\/25/);
    await expect(scrubber2).toHaveClass(/bg-emerald-500\/25/);

    // Verify ribbed resize handles on both ends of scrubbers
    await expect(densityCard.getByLabel('Baseline left resize handle')).toBeVisible();
    await expect(densityCard.getByLabel('Baseline right resize handle')).toBeVisible();
    await expect(densityCard.getByLabel('Recent left resize handle')).toBeVisible();
    await expect(densityCard.getByLabel('Recent right resize handle')).toBeVisible();

    // Verify no ugly "Sample 1" or "Sample 2" text labels in the scrubbers
    await expect(densityCard.getByText('Sample 1:')).not.toBeVisible();
    await expect(densityCard.getByText('Sample 2:')).not.toBeVisible();

    // Verify scrubber keyboard movement (slide position)
    await scrubber1.focus();
    await page.keyboard.press('ArrowRight');
    await expect(scrubber1).toHaveAttribute('aria-valuenow', '2');
    await expect(densityCard.getByText(/^Baseline Solves \(#2–/)).toBeVisible();

    // Verify scrubber keyboard resize (expand window symmetrically with Alt+ArrowRight)
    const box1Before = await scrubber1.boundingBox();
    const box2Before = await scrubber2.boundingBox();
    if (!box1Before || !box2Before) throw new Error('Missing bounding box');

    await page.keyboard.press('Alt+ArrowRight');

    const box1After = await scrubber1.boundingBox();
    const box2After = await scrubber2.boundingBox();
    if (!box1After || !box2After) throw new Error('Missing bounding box');

    // Both scrubbers expanded by the exact same amount
    expect(box1After.width).toBeGreaterThan(box1Before.width);
    expect(box2After.width).toBeGreaterThan(box2Before.width);
    expect(Math.abs(box1After.width - box2After.width)).toBeLessThan(1);
  });

  test('MetricsEvolutionChart renders dual-axis labels and legend series', async ({ page }) => {
    await page.getByTestId('deferred-chart-metrics-evolution').scrollIntoViewIfNeeded();

    const metricsCard = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Metrics Evolution/i }),
    });

    await expect(metricsCard).toBeVisible();

    // Verify Recharts legend series items
    await expect(
      metricsCard.locator('.recharts-legend-item-text', { hasText: 'Min-Max Range' }),
    ).toBeVisible();
    await expect(
      metricsCard.locator('.recharts-legend-item-text', { hasText: 'Mean Time (s)' }),
    ).toBeVisible();
    await expect(
      metricsCard.locator('.recharts-legend-item-text', { hasText: 'Median Time (s)' }),
    ).toBeVisible();
    await expect(
      metricsCard.locator('.recharts-legend-item-text', { hasText: 'Std Dev / Consistency (s)' }),
    ).toBeVisible();

    // Verify dual Y-axis labels
    await expect(metricsCard.locator('text=Time (seconds)')).toBeVisible();
    await expect(metricsCard.locator('text=Standard Deviation (s)')).toBeVisible();
  });

  test('grouping period controls in FileUploader update Box Plot and Metrics Evolution titles', async ({
    page,
  }) => {
    // Initial titles in Daily mode
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Daily Solve Time Distribution & Variance')).toBeVisible();
    await page.getByTestId('deferred-chart-metrics-evolution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Daily Metrics Evolution: Speed & Consistency')).toBeVisible();

    // Switch to Weekly mode
    await page.getByRole('button', { name: /^Weekly/i }).click();
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Weekly Solve Time Distribution & Variance')).toBeVisible();
    await page.getByTestId('deferred-chart-metrics-evolution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Weekly Metrics Evolution: Speed & Consistency')).toBeVisible();

    // Switch to By Solve Count (Batch) mode
    await page.getByRole('button', { name: /^By Solve Count/i }).click();
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Batch Solve Time Distribution & Variance')).toBeVisible();
    await page.getByTestId('deferred-chart-metrics-evolution').scrollIntoViewIfNeeded();
    await expect(page.getByText('Batch Metrics Evolution: Speed & Consistency')).toBeVisible();
  });

  test('DailyDistributionBoxPlot displays solve tooltip on scatter point hover', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();

    const boxPlotCard = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Solve Time Distribution & Variance/i }),
    });

    const svg = boxPlotCard.locator('svg[role="img"]').first();
    await expect(svg).toBeVisible();

    // Hover over an interactive solve point in the SVG
    const solvePoint = svg.locator('circle.cursor-pointer').first();
    await solvePoint.hover({ force: true });

    // Assert hover tooltip displays solve time
    await expect(boxPlotCard.locator('.pointer-events-none')).toContainText(/Solve: \d+\.\d{2}s/);
  });

  test('ChartCardWrapper maximizes chart to fullscreen modal and restores on Escape key', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Daily Solve Time Distribution/i }),
    });

    const maxBtn = card.getByTitle('Maximize to Fullscreen');
    await maxBtn.click();

    // Fullscreen backdrop overlay is visible and body scroll locked
    const modalBackdrop = page.locator('.fixed.inset-0.z-\\[100\\]');
    await expect(modalBackdrop).toBeVisible();
    const lockedOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(lockedOverflow).toBe('hidden');

    // Press Escape to restore
    await page.keyboard.press('Escape');
    await expect(modalBackdrop).toHaveCount(0);
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('ChartCardWrapper restores fullscreen view via Exit Fullscreen button', async ({ page }) => {
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Daily Solve Time Distribution/i }),
    });

    const maxBtn = card.getByTitle('Maximize to Fullscreen');
    await maxBtn.click();

    const modalBackdrop = page.locator('.fixed.inset-0.z-\\[100\\]');
    await expect(modalBackdrop).toBeVisible();

    // Click Exit Fullscreen button
    const exitBtn = modalBackdrop.getByTitle('Restore View (Esc)');
    await exitBtn.click();

    // Fullscreen overlay dismissed
    await expect(modalBackdrop).toHaveCount(0);
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('ChartCardWrapper initiates PNG export download with expected filename prefix', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Daily Solve Time Distribution/i }),
    });

    const downloadBtn = card.getByTitle('Download Plot as PNG Image');
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    await downloadBtn.click();
    const download = await downloadPromise;

    // Verify downloaded filename format
    expect(download.suggestedFilename()).toMatch(/.*solve_distribution_boxplot.*\.png$/);
  });
});
