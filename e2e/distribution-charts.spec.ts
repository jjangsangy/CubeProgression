import { expect, test } from '@playwright/test';

test.describe('Distribution Charts, Evolution & Chart Card Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#progression-chart')).toBeVisible({
      timeout: 15000,
    });
  });

  test('DensityShiftChart quick clicks do not latch scrubber to mouse when moving cursor afterwards', async ({
    page,
  }) => {
    await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('#density-shift-chart');

    await expect(densityCard).toBeVisible();

    const scrubber1 = densityCard.locator('#density-scrubber-baseline');
    const scrubber2 = densityCard.locator('#density-scrubber-recent');
    const handle1 = densityCard.locator('#density-handle-baseline-end');

    await expect(scrubber1).toBeVisible();
    await expect(scrubber2).toBeVisible();
    await expect(handle1).toBeVisible();

    const initialVal1 = await scrubber1.getAttribute('aria-valuenow');
    const initialVal2 = await scrubber2.getAttribute('aria-valuenow');
    const s1BoxBefore = await scrubber1.boundingBox();
    if (!s1BoxBefore) throw new Error('Missing Scrubber 1 bounding box');

    // 1. Quick click on baseline scrubber body
    await scrubber1.click();
    // Move cursor across track without pressing mouse button
    await page.mouse.move(
      s1BoxBefore.x + s1BoxBefore.width + 120,
      s1BoxBefore.y + s1BoxBefore.height / 2,
      {
        steps: 5,
      },
    );
    // Scrubber 1 must remain at initial position and not follow the mouse (auto-retrying assertion)
    await expect(scrubber1).toHaveAttribute('aria-valuenow', initialVal1 ?? '1');

    // 2. Quick click on recent scrubber body
    const s2BoxBefore = await scrubber2.boundingBox();
    if (!s2BoxBefore) throw new Error('Missing Scrubber 2 bounding box');

    await scrubber2.click();
    await page.mouse.move(s2BoxBefore.x - 100, s2BoxBefore.y + s2BoxBefore.height / 2, {
      steps: 5,
    });
    await expect(scrubber2).toHaveAttribute('aria-valuenow', initialVal2 ?? '1');

    // 3. Quick click on resize handle (capture baseline immediately prior to click)
    const handleBox = await handle1.boundingBox();
    const s1BoxPreHandle = await scrubber1.boundingBox();
    if (!handleBox || !s1BoxPreHandle)
      throw new Error('Missing bounding boxes before handle click');

    await handle1.click();
    await page.mouse.move(handleBox.x + 80, handleBox.y + handleBox.height / 2, { steps: 5 });
    await expect(async () => {
      const s1BoxAfter = await scrubber1.boundingBox();
      if (!s1BoxAfter) throw new Error('Missing Scrubber 1 bounding box after handle click');
      expect(Math.abs(s1BoxAfter.width - s1BoxPreHandle.width)).toBeLessThan(1);
    }).toPass({ timeout: 1000 });
  });

  test('DensityShiftChart renders centered summary banner, timeline scrubbers, and ribbed resize handles', async ({
    page,
  }) => {
    await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('#density-shift-chart');

    await expect(densityCard).toBeVisible();

    // Verify statistical summary banner exists and has centered items
    await expect(densityCard.locator('.grid > div')).toHaveCount(3);

    // Verify peak vertical reference lines and horizontal distance bar in real SVG rendering
    const baselineRefLine = densityCard.locator('.recharts-reference-line').filter({
      has: page.locator('line[stroke="#ef4444"]'),
    });
    const recentRefLine = densityCard.locator('.recharts-reference-line').filter({
      has: page.locator('line[stroke="#22c55e"]'),
    });
    const distanceRefLine = densityCard.locator('.recharts-reference-line').filter({
      has: page.locator('line[stroke="#f59e0b"]'),
    });

    await expect(baselineRefLine).toBeVisible();
    await expect(recentRefLine).toBeVisible();
    await expect(distanceRefLine).toBeVisible();

    // Verify vertical peak reference lines have off-center labels formatted as times
    for (const peakRefLine of [baselineRefLine, recentRefLine]) {
      const label = peakRefLine.locator('text');
      const textAnchor = await label.getAttribute('text-anchor');
      expect(textAnchor).not.toBe('middle');
      expect(['start', 'end']).toContain(textAnchor);

      // Verify no "Peak" word, only time
      const textContent = await label.textContent();
      expect(textContent).not.toMatch(/peak/i);
      expect(textContent).toMatch(/^\d+\.\d{2}s$/);

      // Verify the label x coordinate is offset from the line x1 coordinate
      const line = peakRefLine.locator('line');
      const lineX = Number(await line.getAttribute('x1'));
      const textX = Number(await label.getAttribute('x'));
      expect(textX).not.toEqual(lineX);
      if (textAnchor === 'start') {
        expect(textX).toBeGreaterThan(lineX);
      } else {
        expect(textX).toBeLessThan(lineX);
      }
    }

    // Verify horizontal peak distance bar is strictly horizontal, dotted, and has centered label
    const distanceLine = distanceRefLine.locator('line');
    const dX1 = Number(await distanceLine.getAttribute('x1'));
    const dX2 = Number(await distanceLine.getAttribute('x2'));
    const dY1 = Number(await distanceLine.getAttribute('y1'));
    const dY2 = Number(await distanceLine.getAttribute('y2'));
    expect(dX1).not.toEqual(dX2);
    expect(dY1).toEqual(dY2);
    expect(await distanceLine.getAttribute('stroke-dasharray')).toBe('3 3');

    const distanceLabel = distanceRefLine.locator('text');
    await expect(distanceLabel).toHaveAttribute('text-anchor', 'middle');
    const distanceText = await distanceLabel.textContent();
    expect(distanceText).not.toMatch(/peak/i);
    expect(distanceText).toMatch(/^\d+\.\d{2}s$/);

    // Verify scrubbers track and visual sparkline
    const track = densityCard.locator('#density-scrubber-track');
    await expect(track).toBeVisible();

    const scrubber1 = densityCard.locator('#density-scrubber-baseline');
    const scrubber2 = densityCard.locator('#density-scrubber-recent');

    await expect(scrubber1).toBeVisible();
    await expect(scrubber2).toBeVisible();
    await expect(scrubber1).toHaveClass(/bg-rose-500\/25/);
    await expect(scrubber2).toHaveClass(/bg-emerald-500\/25/);

    // Verify ribbed resize handles on both ends of scrubbers
    await expect(densityCard.locator('#density-handle-baseline-start')).toBeVisible();
    await expect(densityCard.locator('#density-handle-baseline-end')).toBeVisible();
    await expect(densityCard.locator('#density-handle-recent-start')).toBeVisible();
    await expect(densityCard.locator('#density-handle-recent-end')).toBeVisible();

    // Verify scrubbers render no text badge labels (no "Sample 1"/"Sample 2" copy)
    expect(((await scrubber1.textContent()) ?? '').trim()).toBe('');
    expect(((await scrubber2.textContent()) ?? '').trim()).toBe('');

    // Verify grouping aggregation vertical boundary lines are rendered on the scrubber track background.
    // Each boundary is a <line> inside a <g> that carries an explanatory <title>.
    const boundaryLines = densityCard.locator('svg[aria-hidden="true"] g:has(> title) > line');
    await expect(boundaryLines.first()).toBeAttached();
    expect(await boundaryLines.count()).toBeGreaterThan(0);

    // Verify scrubber keyboard movement (slide position)
    await scrubber1.focus();
    await page.keyboard.press('ArrowRight');
    await expect(scrubber1).toHaveAttribute('aria-valuenow', '2');

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
    await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('#density-shift-chart');

    await expect(densityCard).toBeVisible();

    const scrubber1 = densityCard.locator('#density-scrubber-baseline');
    const scrubber2 = densityCard.locator('#density-scrubber-recent');

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
    const rightHandle = densityCard.locator('#density-handle-baseline-end');
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
    const track = densityCard.locator('#density-scrubber-track');
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
    await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

    const densityCard = page.locator('#density-shift-chart');

    const maxBtn = densityCard.locator('#density-shift-chart-maximize');
    await maxBtn.click();

    // Verify modal overlay opens
    const modalBackdrop = page.locator('#chart-card-fullscreen-backdrop');
    await expect(modalBackdrop).toBeVisible();

    // Verify chart and scrubbers are visible in fullscreen
    const fullscreenTrack = modalBackdrop.locator('#density-scrubber-track');
    await expect(fullscreenTrack).toBeVisible();

    const fullscreenScrubber1 = modalBackdrop.locator('#density-scrubber-baseline');
    await expect(fullscreenScrubber1).toBeVisible();

    // Exit fullscreen via Escape
    await page.keyboard.press('Escape');
    await expect(modalBackdrop).toHaveCount(0);
  });

  test('MetricsEvolutionChart plots its range band, three series, and a legend entry per series', async ({
    page,
  }) => {
    await page.locator('#deferred-metrics-evolution').scrollIntoViewIfNeeded();

    const metricsCard = page.locator('#metrics-evolution-chart');

    await expect(metricsCard).toBeVisible();

    // Dual Y axes, each rendering its own tick labels.
    const yAxes = metricsCard.locator('.recharts-yAxis');
    await expect(yAxes).toHaveCount(2);
    for (const axis of await yAxes.all()) {
      expect(await axis.locator('.recharts-cartesian-axis-tick').count()).toBeGreaterThan(0);
    }

    // One legend entry per plotted series (range band, mean, median, std dev).
    await expect(metricsCard.locator('.recharts-legend-item-text')).toHaveCount(4);

    // The plotted series themselves: one range area band plus three lines.
    await expect(metricsCard.locator('.recharts-area')).toHaveCount(1);
    await expect(metricsCard.locator('.recharts-line')).toHaveCount(3);
  });

  test('grouping period controls in FileUploader recompute the distribution and evolution charts', async ({
    page,
  }) => {
    await page.locator('#deferred-solve-time-distribution').scrollIntoViewIfNeeded();
    await page.locator('#deferred-metrics-evolution').scrollIntoViewIfNeeded();

    const boxPlot = page.locator('#distribution-chart');
    const metrics = page.locator('#metrics-evolution-chart');

    // Grouping is derived from rendered period count: one box per period group,
    // one X-axis tick per period in the metrics chart. Both charts mount lazily, so wait
    // for a real baseline before comparing (otherwise a 0 -> N mount looks like a change).
    await expect.poll(() => boxPlot.locator('svg rect').count()).toBeGreaterThan(0);
    await expect
      .poll(() => metrics.locator('.recharts-xAxis .recharts-cartesian-axis-tick').count())
      .toBeGreaterThan(0);

    const dailyBoxCount = await boxPlot.locator('svg rect').count();
    const dailyTickCount = await metrics
      .locator('.recharts-xAxis .recharts-cartesian-axis-tick')
      .count();

    // Switch to Weekly mode: aggregation into fewer periods must change both charts
    const weeklyBtn = page.locator('#file-uploader #grouping-weekly');
    await weeklyBtn.click();
    await expect(weeklyBtn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => boxPlot.locator('svg rect').count()).not.toBe(dailyBoxCount);
    await expect
      .poll(() => metrics.locator('.recharts-xAxis .recharts-cartesian-axis-tick').count())
      .not.toBe(dailyTickCount);
    const weeklyBoxCount = await boxPlot.locator('svg rect').count();

    // Switch to By Solve Count (Batch) mode: distribution re-renders again
    const batchBtn = page.locator('#file-uploader #grouping-customBatch');
    await batchBtn.click();
    await expect(batchBtn).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => boxPlot.locator('svg rect').count()).not.toBe(weeklyBoxCount);
  });

  test('DailyDistributionBoxPlot displays solve tooltip on scatter point hover', async ({
    page,
  }) => {
    await page.locator('#deferred-solve-time-distribution').scrollIntoViewIfNeeded();

    const boxPlotCard = page.locator('#distribution-chart');

    const svg = boxPlotCard.locator('#boxplot-svg');
    await expect(svg).toBeVisible();

    // Hover over an interactive solve point in the SVG
    const solvePoint = svg.locator('circle.cursor-pointer').first();
    await solvePoint.hover({ force: true });

    // Assert the hover tooltip reveals a solve time contract value
    await expect
      .poll(async () => (await boxPlotCard.textContent()) ?? '')
      .toMatch(/Solve: \d+\.\d{2}s/);
  });

  test('ChartCardWrapper maximizes chart to fullscreen modal and restores on Escape key', async ({
    page,
  }) => {
    await page.locator('#deferred-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('#distribution-chart');

    const maxBtn = card.locator('#distribution-chart-maximize');
    await maxBtn.click();

    // Fullscreen backdrop overlay is visible and body scroll locked
    const modalBackdrop = page.locator('#chart-card-fullscreen-backdrop');
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
    await page.locator('#deferred-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('#distribution-chart');

    const maxBtn = card.locator('#distribution-chart-maximize');
    await maxBtn.click();

    const modalBackdrop = page.locator('#chart-card-fullscreen-backdrop');
    await expect(modalBackdrop).toBeVisible();

    // Click Exit Fullscreen button
    const exitBtn = modalBackdrop.locator('#distribution-chart-maximize');
    await exitBtn.click();

    // Fullscreen overlay dismissed
    await expect(modalBackdrop).toHaveCount(0);
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('ChartCardWrapper initiates PNG export download with expected filename prefix', async ({
    page,
  }) => {
    await page.locator('#deferred-solve-time-distribution').scrollIntoViewIfNeeded();

    const card = page.locator('#distribution-chart');

    const downloadBtn = card.locator('#distribution-chart-download');
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    await downloadBtn.click();
    const download = await downloadPromise;

    // Verify downloaded filename format
    expect(download.suggestedFilename()).toMatch(/.*solve_distribution_boxplot.*\.png$/);
  });
});
