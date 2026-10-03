import { expect, type Page, test } from '@playwright/test';

test.describe('Mobile & Tablet Responsive Devices & Orientations', () => {
  const deviceProfiles = [
    { name: 'Mobile Portrait (iPhone 14)', width: 390, height: 844 },
    { name: 'Mobile Landscape (iPhone 14)', width: 844, height: 390 },
    { name: 'Tablet Portrait (iPad 7th)', width: 768, height: 1024 },
    { name: 'Tablet Landscape (iPad Air)', width: 1180, height: 820 },
  ];

  const waitForReady = async (page: Page) => {
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Upload cstimer\.txt/)).toBeVisible({ timeout: 15000 });
  };

  for (const { name, width, height } of deviceProfiles) {
    test(`ensures no horizontal page overflow on ${name} (${width}x${height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await waitForReady(page);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test(`ensures loading animation maintains stable position without layout shift on ${name} (${width}x${height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });

      // First ensure dataset exists in IndexedDB for realistic reload test (as shown in user report)
      await page.goto('/');
      await waitForReady(page);

      // Track bounding box and layout stability during page load
      const frames: Array<{
        dropHeight: number;
        distTop: number;
        distBottom: number;
        childCount: number;
      }> = [];

      await page.exposeFunction(
        'recordLoadingMetrics',
        (data: { dropHeight: number; distTop: number; distBottom: number; childCount: number }) => {
          frames.push(data);
        },
      );

      await page.addInitScript(() => {
        const check = () => {
          const dropzone = document.querySelector('section[aria-label="File upload dropzone"]');
          if (dropzone) {
            const dropRect = dropzone.getBoundingClientRect();
            const loadingContainer = dropzone.classList.contains('cursor-wait')
              ? dropzone.querySelector('div.flex.w-full.flex-col')
              : dropzone.querySelector('.cursor-wait div.flex.w-full.flex-col');
            if (loadingContainer) {
              const loadRect = loadingContainer.getBoundingClientRect();
              // @ts-expect-error
              window.recordLoadingMetrics({
                dropHeight: Math.round(dropRect.height),
                distTop: Math.round(loadRect.y - dropRect.y),
                distBottom: Math.round(
                  dropRect.y + dropRect.height - (loadRect.y + loadRect.height),
                ),
                childCount: dropzone.children.length,
              });
            }
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
        setInterval(check, 8);
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      });

      await page.reload();
      await waitForReady(page);

      expect(frames.length).toBeGreaterThan(0);

      for (const frame of frames) {
        // Dropzone never stacks upload prompt and loading animation simultaneously
        expect(frame.childCount).toBe(1);
        // Dropzone height never doubles to ~392px
        expect(frame.dropHeight).toBeLessThanOrEqual(260);
        // Loading animation remains vertically centered (never pushed down to the bottom)
        expect(Math.abs(frame.distTop - frame.distBottom)).toBeLessThanOrEqual(12);
      }
    });
  }

  test.describe('Mobile Portrait Mode (390x844)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForReady(page);
    });

    test('renders compact Navbar with "Demo" label and hides desktop badges', async ({ page }) => {
      const header = page.locator('header');

      // Demo button shows compact text "Demo"
      const demoBtn = header.getByRole('button', { name: 'Demo' });
      await expect(demoBtn).toBeVisible();

      // Long text "Load Sample Data" span is hidden via sm:inline
      const longDemoSpan = header.locator('span:has-text("Load Sample Data")');
      await expect(longDemoSpan).toBeHidden();

      // Export CSV label is hidden on mobile screens
      const exportTextSpan = header.locator('button span:has-text("Export CSV")');
      await expect(exportTextSpan).toBeHidden();

      // Export CSV button itself is still accessible via aria-label
      const exportBtn = header.getByRole('button', { name: 'Export CSV' });
      await expect(exportBtn).toBeVisible();

      // Storage badge is hidden on mobile screens (has hidden lg:flex)
      await expect(header.getByText('Saved locally')).toBeHidden();

      // Filename pill is hidden on mobile screens (has hidden md:flex)
      const filenamePill = header.locator('div.font-mono:has-text("cstimer_")');
      await expect(filenamePill).toBeHidden();
    });

    test('stacks FileUploader into single column and renders 2x2 grouping grid', async ({
      page,
    }) => {
      const uploader = page.locator('div.rounded-2xl').filter({
        has: page.getByLabel('File upload dropzone'),
      });

      const dropzone = uploader.getByLabel('File upload dropzone');
      const controlsBox = uploader.locator('.bg-stone-950\\/60');

      const dropBox = await dropzone.boundingBox();
      const controlsBoundingBox = await controlsBox.boundingBox();
      if (!dropBox || !controlsBoundingBox) throw new Error('Missing bounding box');

      // Dropzone and controls are stacked vertically in single column
      expect(controlsBoundingBox.y).toBeGreaterThan(dropBox.y + dropBox.height - 10);

      // Grouping buttons Daily and Weekly sit on Row 1, Monthly and By Solve Count sit on Row 2
      const dailyBtn = uploader.getByRole('button', { name: /Daily/i });
      const weeklyBtn = uploader.getByRole('button', { name: /Weekly/i });
      const monthlyBtn = uploader.getByRole('button', { name: /Monthly/i });

      const dailyBox = await dailyBtn.boundingBox();
      const weeklyBox = await weeklyBtn.boundingBox();
      const monthlyBox = await monthlyBtn.boundingBox();
      if (!dailyBox || !weeklyBox || !monthlyBox) throw new Error('Missing grouping box');

      // Daily and Weekly share row 1 (approximately equal Y)
      expect(Math.abs(dailyBox.y - weeklyBox.y)).toBeLessThan(8);
      // Monthly sits below Daily on row 2
      expect(monthlyBox.y).toBeGreaterThan(dailyBox.y + dailyBox.height);
    });

    test('stacks all 5 metrics overview cards vertically in single column', async ({ page }) => {
      const cardsGrid = page.locator('.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-5');
      const cards = cardsGrid.locator('> div.rounded-2xl');
      await expect(cards).toHaveCount(5);

      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      const box2 = await cards.nth(2).boundingBox();
      if (!box0 || !box1 || !box2) throw new Error('Missing card box');

      // Vertical stacking: each card sits beneath the previous one
      expect(box1.y).toBeGreaterThan(box0.y + box0.height - 5);
      expect(box2.y).toBeGreaterThan(box1.y + box1.height - 5);
    });

    test('handles SolvesTable horizontal scroll and mobile pagination touch navigation', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-solves-table').scrollIntoViewIfNeeded();
      await expect(page.getByRole('heading', { name: /Session Solve Log/i })).toBeVisible({
        timeout: 10000,
      });

      const solvesSection = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Session Solve Log/i }),
      });

      // Search input takes full card width on mobile
      const searchInput = solvesSection.getByPlaceholder('Search solves or scrambles...');
      const searchBox = await searchInput.boundingBox();
      if (!searchBox) throw new Error('Missing search box');
      expect(searchBox.width).toBeGreaterThan(280);

      // Table container has horizontal scroll enabled
      const scrollContainer = solvesSection.locator('.overflow-x-auto');
      const isScrollable = await scrollContainer.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(isScrollable).toBe(true);

      // Verify pagination next page navigation
      const nextBtn = solvesSection.getByRole('button', { name: 'Next page' });
      await nextBtn.click();
      await expect(solvesSection.getByText('Showing 16 to 30 of 350 solves')).toBeVisible();

      const prevBtn = solvesSection.getByRole('button', { name: 'Previous page' });
      await prevBtn.click();
      await expect(solvesSection.getByText('Showing 1 to 15 of 350 solves')).toBeVisible();
    });

    test('renders DensityShiftChart with 1-column stacked summary banner, hidden timeline instructions, and mobile touch dragging', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
      });
      await expect(densityCard).toBeVisible();

      // Verify the 3-metric summary banner stacks vertically in 1 column on mobile portrait (< 640px)
      const summaryItems = densityCard.locator('.grid > div');
      await expect(summaryItems).toHaveCount(3);
      const item0Box = await summaryItems.nth(0).boundingBox();
      const item1Box = await summaryItems.nth(1).boundingBox();
      const item2Box = await summaryItems.nth(2).boundingBox();
      if (!item0Box || !item1Box || !item2Box)
        throw new Error('Missing summary items bounding boxes');

      expect(item1Box.y).toBeGreaterThan(item0Box.y + 20);
      expect(item2Box.y).toBeGreaterThan(item1Box.y + 20);

      // Verify the timeline instruction label is hidden on mobile portrait to avoid crowding
      const timelineInstruction = densityCard.locator('span.hidden.sm\\:inline', {
        hasText: /Drag scrubbers to move/i,
      });
      await expect(timelineInstruction).toBeHidden();

      // Verify endpoint timeline solve markers are clearly visible
      await expect(densityCard.getByText('Solve #1')).toBeVisible();
      await expect(densityCard.getByText(/^Solve #\d+$/).nth(1)).toBeVisible();

      // Verify Recharts KDE Area paths are generated and visible
      const baselineCurve = densityCard.locator('path[fill="url(#colorBaseline)"]');
      const recentCurve = densityCard.locator('path[fill="url(#colorRecent)"]');
      await expect(baselineCurve).toBeVisible();
      await expect(recentCurve).toBeVisible();

      const initialBaselineD = await baselineCurve.getAttribute('d');
      expect(initialBaselineD).toBeTruthy();

      // Verify interactive touch dragging on mobile scrubber
      const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
      await scrubber1.scrollIntoViewIfNeeded();
      const s1Box = await scrubber1.boundingBox();
      if (!s1Box) throw new Error('Missing scrubber 1 bounding box');

      await page.mouse.move(s1Box.x + s1Box.width / 2, s1Box.y + s1Box.height / 2);
      await page.mouse.down();
      await page.mouse.move(s1Box.x + s1Box.width / 2 + 50, s1Box.y + s1Box.height / 2, {
        steps: 5,
      });
      await page.mouse.up();

      await expect(async () => {
        const newBaselineVal = Number(await scrubber1.getAttribute('aria-valuenow'));
        expect(newBaselineVal).toBeGreaterThan(1);
      }).toPass({ timeout: 3000 });

      const updatedBaselineD = await baselineCurve.getAttribute('d');
      expect(updatedBaselineD).not.toEqual(initialBaselineD);

      // Verify zero horizontal page scroll on mobile portrait
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    });

    test('renders MetricsEvolutionChart with maximized horizontal plot presence and dual-axis labels on mobile portrait', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-metrics-evolution').scrollIntoViewIfNeeded();

      const metricsCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Metrics Evolution/i }),
      });
      await expect(metricsCard).toBeVisible();

      // Verify dual Y-axis labels remain visible
      await expect(metricsCard.getByText('Time (s)', { exact: true })).toBeVisible();
      await expect(metricsCard.getByText('Std Dev (s)', { exact: true })).toBeVisible();

      // Verify the Cartesian grid line width (the inner plot area) maximizes horizontal presence (> 250px)
      const gridLine = metricsCard.locator('.recharts-cartesian-grid-horizontal line').first();
      await expect(gridLine).toBeAttached();
      const x1 = Number(await gridLine.getAttribute('x1'));
      const x2 = Number(await gridLine.getAttribute('x2'));
      const plotWidth = x2 - x1;

      // Previously plotWidth was only ~156px due to 170px margins + widths; now maximized to >= 250px
      expect(plotWidth).toBeGreaterThan(250);
    });

    test('renders bottom axis titles and compact layout across ProgressionChart, PbProgressionChart, BoxPlot, and DensityShiftChart on mobile portrait', async ({
      page,
    }) => {
      // 1. ProgressionChart
      const progressionCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over \d+ Solves/i }),
      });
      await expect(progressionCard).toBeVisible();
      await expect(progressionCard.getByText('Time (s)', { exact: true })).toBeVisible();

      // 2. PbProgressionChart
      const pbContainer = page.getByTestId('deferred-chart-pb-progression');
      await pbContainer.scrollIntoViewIfNeeded();
      await expect(
        pbContainer.getByRole('heading', { name: /PB Progression Over Time/i }),
      ).toBeVisible();
      await expect(pbContainer.getByText('Personal Best Time (s)', { exact: true })).toBeVisible();

      // 3. DailyDistributionBoxPlot
      const boxPlotContainer = page.getByTestId('deferred-chart-solve-time-distribution');
      await boxPlotContainer.scrollIntoViewIfNeeded();
      await expect(
        boxPlotContainer.getByRole('heading', {
          name: /Solve Time Distribution & Variance/i,
        }),
      ).toBeVisible();
      await expect(boxPlotContainer.getByText('Time (s)', { exact: true })).toBeVisible();

      // 4. DensityShiftChart
      const densityContainer = page.getByTestId('deferred-chart-density-shift');
      await densityContainer.scrollIntoViewIfNeeded();
      await expect(
        densityContainer.getByRole('heading', { name: /Time Distribution Shift/i }),
      ).toBeVisible();
      await expect(densityContainer.getByText('Density', { exact: true })).toBeVisible();
    });
  });

  test.describe('Mobile Landscape Mode (844x390)', () => {
    test.use({ viewport: { width: 844, height: 390 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForReady(page);
    });

    test('renders expanded Navbar buttons and 2-column metrics cards layout', async ({ page }) => {
      const header = page.locator('header');

      // "Load Sample Data" text is visible on sm: screens
      const fullDemoSpan = header.locator('button span:has-text("Load Sample Data")');
      await expect(fullDemoSpan).toBeVisible();

      // "Export CSV" text is visible
      const exportTextSpan = header.locator('button span:has-text("Export CSV")');
      await expect(exportTextSpan).toBeVisible();

      // Metrics cards render in 2-columns (Cards 0 and 1 on row 1)
      const cardsGrid = page.locator('.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-5');
      const cards = cardsGrid.locator('> div.rounded-2xl');
      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      const box4 = await cards.nth(4).boundingBox();
      if (!box0 || !box1 || !box4) throw new Error('Missing card box');

      expect(Math.abs(box0.y - box1.y)).toBeLessThan(8);

      // 5th card spans both columns symmetrically
      expect(box4.width).toBeGreaterThan(box0.width * 1.5);
    });

    test('opens chart in fullscreen mode and exits cleanly via button and Escape key', async ({
      page,
    }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over 350 Solves/i }),
      });

      const maximizeBtn = card.getByRole('button', { name: /Maximize/i });
      await maximizeBtn.click();

      // Fullscreen backdrop overlay is visible and includes safe area padding
      const modal = page.locator('.fixed.inset-0.z-\\[100\\]');
      await expect(modal).toBeVisible();
      await expect(modal).toHaveClass(/safe-area-modal/);

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
    });

    test('prevents white sides on iOS Safari landscape: validates viewport-fit=cover, theme-color, and stone-950 dark canvas background on html & body', async ({
      page,
    }) => {
      // 1. Viewport meta tag must include viewport-fit=cover
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('viewport-fit=cover');

      // 2. Theme color and color-scheme must be dark stone-950
      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
      expect(themeColor).toBe('#0c0a09');
      const colorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content');
      expect(colorScheme).toBe('dark');

      // 3. Computed background color of html, body, and root must be rgb(12, 10, 9) (stone-950), never transparent or white
      const backgroundColors = await page.evaluate(() => {
        return {
          html: window.getComputedStyle(document.documentElement).backgroundColor,
          body: window.getComputedStyle(document.body).backgroundColor,
          root: window.getComputedStyle(document.getElementById('root') as HTMLElement)
            .backgroundColor,
        };
      });

      expect(backgroundColors.html).toBe('rgb(12, 10, 9)');
      expect(backgroundColors.body).toBe('rgb(12, 10, 9)');
      expect(backgroundColors.root).toBe('rgb(12, 10, 9)');

      // 4. Page width matches viewport exactly (no white side margins or letterboxes)
      const dimensions = await page.evaluate(() => {
        return {
          windowWidth: window.innerWidth,
          htmlWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.clientWidth,
        };
      });
      expect(dimensions.windowWidth).toBe(844);
      expect(dimensions.htmlWidth).toBe(844);
      expect(dimensions.bodyWidth).toBe(844);
    });

    test('applies safe-area insets to Navbar, Main, and Footer to prevent content clipping in landscape mode', async ({
      page,
    }) => {
      const headerContainer = page.locator('header > div');
      await expect(headerContainer).toHaveClass(/safe-area-x/);

      const mainContainer = page.locator('main');
      await expect(mainContainer).toHaveClass(/safe-area-x/);

      const footer = page.locator('footer');
      await expect(footer).toHaveClass(/safe-area-x/);
    });

    test('renders DensityShiftChart on Mobile Landscape with 3-column banner, visible timeline instructions, and dragging', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
      });
      await expect(densityCard).toBeVisible();

      // In landscape (844px >= 640px sm: breakpoint), summary banner items align in a single row
      const summaryItems = densityCard.locator('.grid > div');
      await expect(summaryItems).toHaveCount(3);
      const item0Box = await summaryItems.nth(0).boundingBox();
      const item1Box = await summaryItems.nth(1).boundingBox();
      if (!item0Box || !item1Box) throw new Error('Missing summary items bounding boxes');
      expect(Math.abs(item0Box.y - item1Box.y)).toBeLessThan(6);

      // Timeline instruction text is visible on landscape (>= 640px)
      const timelineInstruction = densityCard.locator('span.hidden.sm\\:inline', {
        hasText: /Drag scrubbers to move/i,
      });
      await expect(timelineInstruction).toBeVisible();

      // Verify dragging scrubber in landscape (ensure scrubber is scrolled into view in 390px viewport)
      const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
      await scrubber1.scrollIntoViewIfNeeded();
      const s1Box = await scrubber1.boundingBox();
      if (!s1Box) throw new Error('Missing scrubber bounding box');

      const baselineCurve = densityCard.locator('path[fill="url(#colorBaseline)"]');
      const initialD = await baselineCurve.getAttribute('d');

      await page.mouse.move(s1Box.x + s1Box.width / 2, s1Box.y + s1Box.height / 2);
      await page.mouse.down();
      await page.mouse.move(s1Box.x + s1Box.width / 2 + 60, s1Box.y + s1Box.height / 2, {
        steps: 5,
      });
      await page.mouse.up();

      await expect(async () => {
        const val = Number(await scrubber1.getAttribute('aria-valuenow'));
        expect(val).toBeGreaterThan(1);
      }).toPass({ timeout: 3000 });
      const newD = await baselineCurve.getAttribute('d');
      expect(newD).not.toEqual(initialD);
    });
  });

  test.describe('Tablet Portrait Mode (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForReady(page);
    });

    test('renders filename pill in Navbar while hiding storage badge', async ({ page }) => {
      const header = page.locator('header');

      // Filename is visible on md: screens
      const filenamePill = header.locator('div.font-mono:has-text("cstimer_")');
      await expect(filenamePill).toBeVisible();

      // Storage badge is still hidden below lg:
      await expect(header.getByText('Saved locally')).toBeHidden();
    });

    test('renders ProgressionChart interval sliders side-by-side on tablet portrait', async ({
      page,
    }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over 350 Solves/i }),
      });

      // Switch to interval mode
      const intervalBtn = card.getByRole('button', { name: /Solve # Interval/i });
      await intervalBtn.click();

      const sliders = card.locator('input[type="range"]');
      await expect(sliders).toHaveCount(2);

      const slider1Box = await sliders.nth(0).boundingBox();
      const slider2Box = await sliders.nth(1).boundingBox();
      if (!slider1Box || !slider2Box) throw new Error('Missing slider box');

      // On tablet md: breakpoint, sliders sit side-by-side in md:flex-row
      expect(Math.abs(slider1Box.y - slider2Box.y)).toBeLessThan(12);
      expect(slider2Box.x).toBeGreaterThan(slider1Box.x);
    });

    test('interacts with PB milestone history drawer on tablet', async ({ page }) => {
      await page.getByTestId('deferred-chart-pb-progression').scrollIntoViewIfNeeded();
      await expect(page.getByRole('heading', { name: /PB Progression Over Time/i })).toBeVisible({
        timeout: 10000,
      });

      const pbCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /PB Progression Over Time/i }),
      });

      const drawerBtn = pbCard.getByRole('button', { name: /Record Milestones History/i });
      await drawerBtn.click();

      // Scoped to milestone drawer container
      const drawer = pbCard.locator('.fade-in', { hasText: 'Filter Record Type:' });
      await expect(drawer).toBeVisible();

      // Filter by Single milestones
      const singleFilter = drawer.getByRole('button', { name: 'Single', exact: true });
      await singleFilter.click();
      await expect(singleFilter).toHaveClass(/bg-amber-500\/20/);

      // Verify milestone cards are rendered
      const badges = drawer.locator('span:has-text("PB Single")');
      expect(await badges.count()).toBeGreaterThan(0);

      // Close drawer
      await drawerBtn.click();
      await expect(pbCard.getByText('Filter Record Type:')).toHaveCount(0);
    });

    test('interacts with DensityShiftChart on Tablet Portrait: drag scrubber and resize ribbed handle symmetrically', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
      });
      await expect(densityCard).toBeVisible();

      // 3-column banner aligns in a single row on tablet portrait (768px >= 640px)
      const summaryItems = densityCard.locator('.grid > div');
      await expect(summaryItems).toHaveCount(3);
      const item0Box = await summaryItems.nth(0).boundingBox();
      const item2Box = await summaryItems.nth(2).boundingBox();
      if (!item0Box || !item2Box) throw new Error('Missing summary items bounding boxes');
      expect(Math.abs(item0Box.y - item2Box.y)).toBeLessThan(6);

      const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
      const scrubber2 = densityCard.getByRole('slider', { name: 'Recent scrubber position' });

      // Drag right ribbed handle on Scrubber 1 to expand sample size symmetrically
      const rightHandle = densityCard.getByLabel('Baseline right resize handle');
      const handleBox = await rightHandle.boundingBox();
      if (!handleBox) throw new Error('Missing resize handle bounding box');

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

      expect(s1WidthAfter).toBeGreaterThan(s1WidthBefore);
      expect(s2WidthAfter).toBeGreaterThan(s2WidthBefore);
      expect(Math.abs(s1WidthAfter - s2WidthAfter)).toBeLessThan(1);
    });
  });

  test.describe('Tablet Landscape Mode (1180x820)', () => {
    test.use({ viewport: { width: 1180, height: 820 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForReady(page);
    });

    test('renders storage badge in Navbar and all 5 overview cards in a single row', async ({
      page,
    }) => {
      const header = page.locator('header');

      // Both filename and storage badge are visible on lg: screens
      await expect(header.getByText('Saved locally')).toBeVisible();

      // All 5 overview cards sit side-by-side on row 1
      const cardsGrid = page.locator('.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-5');
      const cards = cardsGrid.locator('> div.rounded-2xl');
      await expect(cards).toHaveCount(5);

      const box0 = await cards.nth(0).boundingBox();
      const box4 = await cards.nth(4).boundingBox();
      if (!box0 || !box4) throw new Error('Missing card box');
      expect(Math.abs(box0.y - box4.y)).toBeLessThan(10);
    });

    test('renders DensityShiftChart and MetricsEvolutionChart as full-width stacked charts', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

      const densityHeading = page.getByRole('heading', { name: /Time Distribution Shift/i });
      const metricsHeading = page.getByRole('heading', { name: /Metrics Evolution/i });

      await expect(densityHeading).toBeVisible();
      await expect(metricsHeading).toBeVisible();

      const boxDensity = await densityHeading.boundingBox();
      const boxMetrics = await metricsHeading.boundingBox();
      if (!boxDensity || !boxMetrics) throw new Error('Missing heading box');

      // Stacked full-width charts: metrics chart sits below density shift chart
      expect(boxMetrics.y).toBeGreaterThan(boxDensity.y + 100);
      expect(Math.abs(boxDensity.x - boxMetrics.x)).toBeLessThan(25);
    });

    test('activates Custom Ao moving average on tablet landscape', async ({ page }) => {
      const card = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Progression Over 350 Solves/i }),
      });

      const customAoBtn = card.getByRole('button', { name: /Custom Ao/i });
      await customAoBtn.click();

      const spinInput = card.getByRole('spinbutton');
      await expect(spinInput).toBeVisible();
      await spinInput.fill('35');

      await expect(
        card.locator('.recharts-legend-item-text', { hasText: '35-Solve Moving Average (Ao35)' }),
      ).toBeVisible();
    });

    test('interacts with DensityShiftChart on Tablet Landscape: timeline track clicking and fullscreen modal view', async ({
      page,
    }) => {
      await page.getByTestId('deferred-chart-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('div.rounded-2xl').filter({
        has: page.getByRole('heading', { name: /Time Distribution Shift/i }),
      });
      await expect(densityCard).toBeVisible();

      const scrubber1 = densityCard.getByRole('slider', { name: 'Baseline scrubber position' });
      const scrubber2 = densityCard.getByRole('slider', { name: 'Recent scrubber position' });

      // Click track in the empty region between scrubbers to reposition closer scrubber
      await page.waitForTimeout(100);
      const track = densityCard.getByLabel('Solve distribution timeline scrubbers track');
      await track.scrollIntoViewIfNeeded();
      const s1BoxAfter = await scrubber1.boundingBox();
      const s2BoxAfter = await scrubber2.boundingBox();
      const trackBox = await track.boundingBox();
      if (!s1BoxAfter || !s2BoxAfter || !trackBox) throw new Error('Missing track bounding box');

      const gapMidpointX = (s1BoxAfter.x + s1BoxAfter.width + s2BoxAfter.x) / 2;
      const clickTrackOffset = gapMidpointX - trackBox.x;

      const prevScrubber2Val = Number(await scrubber2.getAttribute('aria-valuenow'));
      await track.click({ position: { x: clickTrackOffset, y: trackBox.height / 2 } });

      await expect(async () => {
        const afterClickScrubber2Val = Number(await scrubber2.getAttribute('aria-valuenow'));
        expect(afterClickScrubber2Val).not.toEqual(prevScrubber2Val);
      }).toPass({ timeout: 3000 });

      // Maximize to fullscreen modal and verify layout
      const maxBtn = densityCard.getByTitle('Maximize to Fullscreen');
      await maxBtn.click();

      const modalBackdrop = page.locator('.fixed.inset-0.z-\\[100\\]');
      await expect(modalBackdrop).toBeVisible();

      // Ensure chart, banner, and scrubbers are all rendered inside fullscreen modal
      await expect(
        modalBackdrop.getByLabel('Solve distribution timeline scrubbers track'),
      ).toBeVisible();
      await expect(
        modalBackdrop.getByRole('slider', { name: 'Baseline scrubber position' }),
      ).toBeVisible();

      // Exit fullscreen
      await page.keyboard.press('Escape');
      await expect(modalBackdrop).toHaveCount(0);
    });
  });
});
