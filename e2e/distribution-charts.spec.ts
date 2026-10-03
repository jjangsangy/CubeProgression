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

    // Verify peak vertical reference lines and horizontal distance bar in real SVG rendering
    const refLines = densityCard.locator('.recharts-reference-line');
    await expect(refLines).toHaveCount(3);

    const refLabels = densityCard.locator('.recharts-reference-line text');
    await expect(refLabels).toHaveCount(3);

    // Verify vertical peak reference lines (indices 0 and 1) have off-center labels
    for (let i = 0; i < 2; i++) {
      const label = refLabels.nth(i);
      const textAnchor = await label.getAttribute('text-anchor');
      expect(textAnchor).not.toBe('middle');
      expect(['start', 'end']).toContain(textAnchor);

      // Verify no "Peak" word, only time
      const textContent = await label.textContent();
      expect(textContent).not.toMatch(/peak/i);
      expect(textContent).toMatch(/^\d+\.\d{2}s$/);

      // Verify the label x coordinate is offset from the line x1 coordinate
      const line = refLines.nth(i).locator('line');
      const lineX = Number(await line.getAttribute('x1'));
      const textX = Number(await label.getAttribute('x'));
      expect(textX).not.toEqual(lineX);
      if (textAnchor === 'start') {
        expect(textX).toBeGreaterThan(lineX);
      } else {
        expect(textX).toBeLessThan(lineX);
      }
    }

    // Verify horizontal peak distance bar (index 2) is strictly horizontal, dotted, and has centered label
    const distanceLine = refLines.nth(2).locator('line');
    const dX1 = Number(await distanceLine.getAttribute('x1'));
    const dX2 = Number(await distanceLine.getAttribute('x2'));
    const dY1 = Number(await distanceLine.getAttribute('y1'));
    const dY2 = Number(await distanceLine.getAttribute('y2'));
    expect(dX1).not.toEqual(dX2);
    expect(dY1).toEqual(dY2);
    expect(await distanceLine.getAttribute('stroke-dasharray')).toBe('3 3');

    const distanceLabel = refLabels.nth(2);
    const distanceAnchor = await distanceLabel.getAttribute('text-anchor');
    expect(distanceAnchor).toBe('middle');
    const distanceText = await distanceLabel.textContent();
    expect(distanceText).not.toMatch(/peak/i);
    expect(distanceText).toMatch(/^\d+\.\d{2}s$/);

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

    // Verify grouping aggregation vertical boundary lines are rendered on the scrubber track background
    const boundaryLines = densityCard.locator('line[data-testid="group-boundary-line"]');
    await expect(boundaryLines.first()).toBeAttached();
    const boundaryCount = await boundaryLines.count();
    expect(boundaryCount).toBeGreaterThan(0);

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

    // Both scrubbers expand symmetrically (allowing for 150ms CSS transition to settle)
    await expect(async () => {
      const box1After = await scrubber1.boundingBox();
      const box2After = await scrubber2.boundingBox();
      if (!box1After || !box2After) throw new Error('Missing bounding box');
      expect(box1After.width).toBeGreaterThan(box1Before.width);
      expect(box2After.width).toBeGreaterThan(box2Before.width);
      expect(Math.abs(box1After.width - box2After.width)).toBeLessThan(1);
    }).toPass({ timeout: 2000 });
  });

  test('DensityShiftChart supports direct pointer dragging of scrubbers, ribbed resize handles, track clicking, and dynamic KDE plot updates', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
    });

    await expect(densityCard).toBeVisible();

    const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
    const scrubber2 = densityCard.getByRole('slider', { name: 'Recent scrubber position' });

    // Verify initial KDE curve paths are rendered
    const baselineArea = densityCard.locator('path[fill="url(#colorBaseline)"]');
    const recentArea = densityCard.locator('path[fill="url(#colorRecent)"]');
    await expect(baselineArea).toBeVisible();
    await expect(recentArea).toBeVisible();

    const initialBaselineD = await baselineArea.getAttribute('d');
    expect(initialBaselineD).toBeTruthy();

    // Direct pointer drag on Scrubber 1 body
    const s1Box = await scrubber1.boundingBox();
    if (!s1Box) throw new Error('Missing Scrubber 1 bounding box');

    await page.mouse.move(s1Box.x + s1Box.width / 2, s1Box.y + s1Box.height / 2);
    await page.mouse.down();
    await page.mouse.move(s1Box.x + s1Box.width / 2 + 70, s1Box.y + s1Box.height / 2, { steps: 5 });
    await page.mouse.up();

    // Verify scrubber 1 position moved
    const newAriaVal = await scrubber1.getAttribute('aria-valuenow');
    expect(Number(newAriaVal)).toBeGreaterThan(1);

    // Verify Recharts Area path recalculated dynamically from new solve subset
    const updatedBaselineD = await baselineArea.getAttribute('d');
    expect(updatedBaselineD).not.toEqual(initialBaselineD);

    // Direct pointer drag on right resize handle to expand sample window symmetrically
    const rightHandle = densityCard.getByLabel('Baseline right resize handle');
    const handleBox = await rightHandle.boundingBox();
    if (!handleBox) throw new Error('Missing right handle box');

    const s1BoxBefore = await scrubber1.boundingBox();
    const s2BoxBefore = await scrubber2.boundingBox();
    if (!s1BoxBefore || !s2BoxBefore) throw new Error('Missing scrubber bounding box');
    const s1WidthBefore = s1BoxBefore.width;
    const s2WidthBefore = s2BoxBefore.width;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 50,
      handleBox.y + handleBox.height / 2,
      { steps: 5 },
    );
    await page.mouse.up();

    const s1BoxAfter = await scrubber1.boundingBox();
    const s2BoxAfter = await scrubber2.boundingBox();
    if (!s1BoxAfter || !s2BoxAfter) throw new Error('Missing scrubber bounding box');
    const s1WidthAfter = s1BoxAfter.width;
    const s2WidthAfter = s2BoxAfter.width;

    // Both scrubbers expanded symmetrically
    expect(s1WidthAfter).toBeGreaterThan(s1WidthBefore);
    expect(s2WidthAfter).toBeGreaterThan(s2WidthBefore);
    expect(Math.abs(s1WidthAfter - s2WidthAfter)).toBeLessThan(1);

    // Timeline track click to reposition scrubber
    // Target the empty track area midpoint between scrubber 1 and scrubber 2
    await page.waitForTimeout(100);
    const track = densityCard.getByLabel('Solve distribution timeline scrubbers track');
    await track.scrollIntoViewIfNeeded();
    const s1BoxAfterDrag = await scrubber1.boundingBox();
    const s2BoxAfterDrag = await scrubber2.boundingBox();
    const trackBox = await track.boundingBox();
    if (!s1BoxAfterDrag || !s2BoxAfterDrag || !trackBox) throw new Error('Missing bounding boxes');

    const gapMidpointX = (s1BoxAfterDrag.x + s1BoxAfterDrag.width + s2BoxAfterDrag.x) / 2;
    const clickTrackOffset = gapMidpointX - trackBox.x;

    const prevScrubber1Val = Number(await scrubber1.getAttribute('aria-valuenow'));
    await track.click({ position: { x: clickTrackOffset, y: trackBox.height / 2 } });

    await expect(async () => {
      const afterClickScrubber1Val = Number(await scrubber1.getAttribute('aria-valuenow'));
      expect(afterClickScrubber1Val).not.toEqual(prevScrubber1Val);
    }).toPass({ timeout: 3000 });
  });

  test('DensityShiftChart supports fullscreen modal view with interactive scrubbers and clean restoration', async ({
    page,
  }) => {
    await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('div.rounded-2xl').filter({
      has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
    });

    const maxBtn = densityCard.getByTitle('Maximize to Fullscreen');
    await maxBtn.click();

    // Verify modal overlay opens
    const modalBackdrop = page.locator('.fixed.inset-0.z-\\[100\\]');
    await expect(modalBackdrop).toBeVisible();

    // Verify chart and scrubbers are visible in fullscreen
    const fullscreenTrack = modalBackdrop.getByLabel('Solve distribution timeline scrubbers track');
    await expect(fullscreenTrack).toBeVisible();

    const fullscreenScrubber1 = modalBackdrop.getByRole('slider', {
      name: 'Baseline scrubber position',
    });
    await expect(fullscreenScrubber1).toBeVisible();

    // Exit fullscreen via Escape
    await page.keyboard.press('Escape');
    await expect(modalBackdrop).toHaveCount(0);
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
    await expect(metricsCard.getByText('Time (s)', { exact: true })).toBeVisible();
    await expect(metricsCard.getByText('Std Dev (s)', { exact: true })).toBeVisible();
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
