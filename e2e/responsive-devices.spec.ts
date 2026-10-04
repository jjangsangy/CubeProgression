import { expect, type Page, test } from '@playwright/test';

test.describe('Mobile & Tablet Responsive Devices & Orientations', () => {
  const deviceProfiles = [
    { name: 'Mobile Portrait (iPhone 14)', width: 390, height: 844 },
    { name: 'Mobile Landscape (iPhone 14)', width: 844, height: 390 },
    { name: 'Tablet Portrait (iPad 7th)', width: 768, height: 1024 },
    { name: 'Tablet Landscape (iPad Air)', width: 1180, height: 820 },
  ];

  const waitForReady = async (page: Page) => {
    await expect(page.locator('#session-selector')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#progression-chart')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#file-uploader')).toBeVisible({ timeout: 15000 });
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
          const dropzone = document.querySelector('#file-dropzone');
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

    test('renders compact Navbar and hides desktop badges', async ({ page }) => {
      const header = page.locator('#navbar');

      // csTimer Guide shows only its compact label span on mobile screens
      const guideBtn = header.locator('#navbar-guide');
      await expect(guideBtn).toBeVisible();
      const guideLabels = guideBtn.locator('span');
      await expect(guideLabels).toHaveCount(2);
      await expect(guideLabels.nth(0)).toBeVisible();
      await expect(guideLabels.nth(1)).toBeHidden();

      // Filename pill is hidden on mobile screens (has hidden md:flex)
      await expect(header.locator('#navbar-filename')).toBeHidden();
    });

    test('verifies mobile portrait header layout: completely filled, no overlap, evenly spaced, no overflow, brand and buttons visible', async ({
      page,
    }) => {
      const header = page.locator('#navbar');
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
      if (!headerBox) return;

      // 1. Header does not go outside viewport bounds
      expect(headerBox.x).toBeGreaterThanOrEqual(0);
      expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(390 + 1);

      // 2. Brand identity: brand heading and logo icon are visible
      const brandHeading = header.getByRole('heading', { level: 1 });
      await expect(brandHeading).toBeVisible();
      const logoIcon = header.locator('img');
      await expect(logoIcon).toHaveCount(1);
      await expect(logoIcon).toBeVisible();

      // 3. Header items are spaced cleanly throughout, fill the header, and never overlap
      const brandBox = await brandHeading.boundingBox();
      const themeBtn = header.locator('#theme-selector-btn');
      const guideBtn = header.locator('#navbar-guide');

      const buttons = [themeBtn, guideBtn];
      for (const btn of buttons) {
        await expect(btn).toBeVisible();
      }

      const buttonBoxes = [];
      for (const btn of buttons) {
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        if (box) buttonBoxes.push(box);
      }

      expect(brandBox).not.toBeNull();
      if (!brandBox) return;
      expect(brandBox.x).toBeGreaterThanOrEqual(headerBox.x);

      for (const box of buttonBoxes) {
        expect(box.x + box.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
      }

      // Check elements never overlap each other horizontally
      const allBoxes = [brandBox, ...buttonBoxes];
      for (let i = 0; i < allBoxes.length - 1; i++) {
        const current = allBoxes[i];
        const next = allBoxes[i + 1];
        expect(current.x + current.width).toBeLessThanOrEqual(next.x + 1);
      }

      // Check all interactive elements have adequate touch target dimensions
      for (const box of buttonBoxes) {
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }

      // Check header does not cause horizontal page overflow
      const pageScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageScrollWidth).toBeLessThanOrEqual(390 + 1);
    });

    test('stacks FileUploader into single column and renders 2x2 grouping grid', async ({
      page,
    }) => {
      const uploader = page.locator('#file-uploader');

      const dropzone = uploader.locator('#file-dropzone');
      const controlsBox = uploader.locator('.bg-stone-950\\/60');

      const dropBox = await dropzone.boundingBox();
      const controlsBoundingBox = await controlsBox.boundingBox();
      if (!dropBox || !controlsBoundingBox) throw new Error('Missing bounding box');

      // Dropzone and controls are stacked vertically in single column
      expect(controlsBoundingBox.y).toBeGreaterThan(dropBox.y + dropBox.height - 10);

      // Grouping buttons Daily and Weekly sit on Row 1, Monthly and By Solve Count sit on Row 2
      const dailyBtn = uploader.locator('#grouping-daily');
      const weeklyBtn = uploader.locator('#grouping-weekly');
      const monthlyBtn = uploader.locator('#grouping-monthly');

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
      const cardsGrid = page.locator('#metrics-overview');
      const cards = cardsGrid.locator('> div');
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
      await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
      const solvesSection = page.locator('#solves-table');
      await expect(solvesSection).toBeVisible({ timeout: 10000 });

      // Search input takes full card width on mobile
      const searchInput = solvesSection.locator('input[type="text"]');
      const searchBox = await searchInput.boundingBox();
      if (!searchBox) throw new Error('Missing search box');
      expect(searchBox.width).toBeGreaterThan(280);

      // Table container has horizontal scroll enabled
      const scrollContainer = solvesSection.locator('.overflow-x-auto');
      const isScrollable = await scrollContainer.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(isScrollable).toBe(true);

      // Verify pagination navigation via the pagination contract value
      const nextBtn = solvesSection.locator('#solves-next-page');
      await nextBtn.click();
      await expect
        .poll(async () =>
          (await solvesSection.locator('#pagination-indicator').textContent())?.trim(),
        )
        .toBe('2 / 24');

      const prevBtn = solvesSection.locator('#solves-prev-page');
      await prevBtn.click();
      await expect
        .poll(async () =>
          (await solvesSection.locator('#pagination-indicator').textContent())?.trim(),
        )
        .toBe('1 / 24');
    });

    test('renders DensityShiftChart with 1-column stacked summary banner, hidden timeline instructions, and mobile touch dragging', async ({
      page,
    }) => {
      await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('#density-shift-chart');
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

      // Verify the timeline instruction label is hidden on mobile portrait to avoid crowding,
      // while both endpoint solve markers stay visible (the row holds exactly three spans).
      const timelineLabels = densityCard.locator('#density-scrubber-track + div > span');
      await expect(timelineLabels).toHaveCount(3);
      await expect(timelineLabels.nth(0)).toBeVisible();
      await expect(timelineLabels.nth(1)).toBeHidden();
      await expect(timelineLabels.nth(2)).toBeVisible();

      // Verify Recharts KDE Area paths are generated and visible
      const baselineCurve = densityCard.locator('path[fill="url(#colorBaseline)"]');
      const recentCurve = densityCard.locator('path[fill="url(#colorRecent)"]');
      await expect(baselineCurve).toBeVisible();
      await expect(recentCurve).toBeVisible();

      const initialBaselineD = await baselineCurve.getAttribute('d');
      expect(initialBaselineD).toBeTruthy();

      // Verify interactive touch dragging on mobile scrubber
      const scrubber1 = densityCard.locator('#density-scrubber-baseline');
      await scrubber1.scrollIntoViewIfNeeded();
      const s1Box = await scrubber1.boundingBox();
      if (!s1Box) throw new Error('Missing scrubber 1 bounding box');

      // Verify scrubber height is shrunk responsively on mobile portrait (track h-12 = 48px, inner scrubber = 46px)
      const track = densityCard.locator('#density-scrubber-track');
      const trackBox = await track.boundingBox();
      expect(trackBox).not.toBeNull();
      expect(Math.round(trackBox?.height ?? 0)).toBe(48);
      expect(Math.round(s1Box.height)).toBe(46);

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
      await page.locator('#deferred-metrics-evolution').scrollIntoViewIfNeeded();

      const metricsCard = page.locator('#metrics-evolution-chart');
      await expect(metricsCard).toBeVisible();

      // Verify the dual Y-axis structure renders and its mobile bottom axis titles are visible
      await expect(metricsCard.locator('.recharts-yAxis')).toHaveCount(2);
      const axisTitles = metricsCard.locator('#metrics-mobile-axis-title');
      await expect(axisTitles).toHaveCount(1);
      await expect(axisTitles.locator('span:visible')).toHaveCount(2);

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
      const progressionCard = page.locator('#progression-chart');
      await expect(progressionCard).toBeVisible();
      await expect(progressionCard.locator('#progression-mobile-axis-title')).toBeVisible();

      // 2. PbProgressionChart
      const pbContainer = page.locator('#deferred-pb-progression');
      await pbContainer.scrollIntoViewIfNeeded();
      const pbCard = page.locator('#pb-progression-chart');
      await expect(pbCard).toBeVisible();
      await expect(pbCard.locator('#pb-mobile-axis-title')).toBeVisible();
      // On mobile portrait, the rotated desktop Y-axis label node is omitted
      await expect(pbCard.locator('.recharts-yAxis .recharts-label')).toHaveCount(0);

      // 3. DailyDistributionBoxPlot
      const boxPlotContainer = page.locator('#deferred-solve-time-distribution');
      await boxPlotContainer.scrollIntoViewIfNeeded();
      const boxPlotCard = page.locator('#distribution-chart');
      await expect(boxPlotCard).toBeVisible();
      const boxPlotAxisTitle = boxPlotCard.locator('#distribution-mobile-axis-title');
      await expect(boxPlotAxisTitle).toHaveCount(1);
      await expect(boxPlotAxisTitle).toBeVisible();
      // On mobile portrait, the rotated desktop Y-axis label is omitted from the plot svg
      await expect(page.locator('#boxplot-svg')).toHaveCount(1);
      await expect(page.locator('#boxplot-svg text[transform]')).toHaveCount(0);

      // 4. DensityShiftChart
      const densityContainer = page.locator('#deferred-density-shift');
      await densityContainer.scrollIntoViewIfNeeded();
      const densityCard = page.locator('#density-shift-chart');
      await expect(densityCard).toBeVisible();
      const densityAxisTitle = densityCard.locator('#density-mobile-axis-title');
      await expect(densityAxisTitle).toHaveCount(1);
      await expect(densityAxisTitle).toBeVisible();
    });
  });

  test.describe('Mobile Landscape Mode (844x390)', () => {
    test.use({ viewport: { width: 844, height: 390 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForReady(page);
    });

    test('renders expanded Navbar buttons and 2-column metrics cards layout', async ({ page }) => {
      const header = page.locator('#navbar');

      // "csTimer Guide" full label span is visible on landscape mode
      const guideBtn = header.locator('#navbar-guide');
      await expect(guideBtn).toBeVisible();
      const guideLabels = guideBtn.locator('span');
      await expect(guideLabels).toHaveCount(2);
      await expect(guideLabels.nth(0)).toBeHidden();
      await expect(guideLabels.nth(1)).toBeVisible();

      // Metrics cards render in 2-columns (Cards 0 and 1 on row 1)
      const cardsGrid = page.locator('#metrics-overview');
      const cards = cardsGrid.locator('> div');
      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      const box4 = await cards.nth(4).boundingBox();
      if (!box0 || !box1 || !box4) throw new Error('Missing card box');

      expect(Math.abs(box0.y - box1.y)).toBeLessThan(8);

      // 5th card spans both columns symmetrically
      expect(box4.width).toBeGreaterThan(box0.width * 1.5);
    });

    test('verifies mobile landscape header layout: stays within bounds, no overlap, brand title visible', async ({
      page,
    }) => {
      const header = page.locator('#navbar');
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
      if (!headerBox) return;

      // 1. Header does not go outside viewport bounds
      expect(headerBox.x).toBeGreaterThanOrEqual(0);
      expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(844 + 1);

      // 2. Brand title span is visible on landscape mode
      const brandSpan = header.locator('h1 span');
      await expect(brandSpan).toHaveCount(1);
      await expect(brandSpan).toBeVisible();

      // 3. All visible header elements stay within bounds and do not overlap
      const visibleElements = await header.locator('button, img, #navbar-filename').all();
      const boxes = [];
      for (const el of visibleElements) {
        if (await el.isVisible()) {
          const b = await el.boundingBox();
          if (b && b.width > 0) boxes.push(b);
        }
      }
      boxes.sort((a, b) => a.x - b.x);

      for (let i = 0; i < boxes.length - 1; i++) {
        expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(boxes[i + 1].x + 1);
      }
      const last = boxes[boxes.length - 1];
      expect(last.x + last.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
    });

    test('opens chart in fullscreen mode and exits cleanly via button and Escape key', async ({
      page,
    }) => {
      const card = page.locator('#progression-chart');

      const maximizeBtn = card.locator('#progression-chart-maximize');
      await maximizeBtn.click();

      // Fullscreen backdrop overlay is visible and includes safe area padding
      const modal = page.locator('#chart-card-fullscreen-backdrop');
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
      await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('#density-shift-chart');
      await expect(densityCard).toBeVisible();

      // In landscape (844px >= 640px sm: breakpoint), summary banner items align in a single row
      const summaryItems = densityCard.locator('.grid > div');
      await expect(summaryItems).toHaveCount(3);
      const item0Box = await summaryItems.nth(0).boundingBox();
      const item1Box = await summaryItems.nth(1).boundingBox();
      if (!item0Box || !item1Box) throw new Error('Missing summary items bounding boxes');
      expect(Math.abs(item0Box.y - item1Box.y)).toBeLessThan(6);

      // Timeline instruction text is visible on landscape (>= 640px)
      const timelineLabels = densityCard.locator('#density-scrubber-track + div > span');
      await expect(timelineLabels).toHaveCount(3);
      await expect(timelineLabels.nth(1)).toBeVisible();

      // Verify dragging scrubber in landscape (ensure scrubber is scrolled into view in 390px viewport)
      const scrubber1 = densityCard.locator('#density-scrubber-baseline');
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

    test('renders filename pill in Navbar on tablet screens', async ({ page }) => {
      const header = page.locator('#navbar');

      // Filename is visible on md: screens
      await expect(header.locator('#navbar-filename')).toBeVisible();
    });

    test('verifies tablet portrait header layout: stays within bounds, no overlap, title visible, no overflow', async ({
      page,
    }) => {
      const header = page.locator('#navbar');
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
      if (!headerBox) return;

      // 1. Header does not go outside viewport bounds
      expect(headerBox.x).toBeGreaterThanOrEqual(0);
      expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(768 + 1);

      // 2. Brand title span is visible on tablet portrait mode
      const brandSpan = header.locator('h1 span');
      await expect(brandSpan).toHaveCount(1);
      await expect(brandSpan).toBeVisible();

      // 3. All visible header elements stay within bounds and do not overlap
      const visibleElements = await header.locator('button, img, #navbar-filename').all();
      const boxes = [];
      for (const el of visibleElements) {
        if (await el.isVisible()) {
          const b = await el.boundingBox();
          if (b && b.width > 0) boxes.push(b);
        }
      }
      boxes.sort((a, b) => a.x - b.x);

      for (let i = 0; i < boxes.length - 1; i++) {
        expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(boxes[i + 1].x + 1);
      }
      const last = boxes[boxes.length - 1];
      expect(last.x + last.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
    });

    test('renders ProgressionChart interval sliders side-by-side on tablet portrait', async ({
      page,
    }) => {
      const card = page.locator('#progression-chart');

      // Switch to interval mode
      const intervalBtn = card.locator('#progression-solve-interval');
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
      await page.locator('#deferred-pb-progression').scrollIntoViewIfNeeded();
      const pbCard = page.locator('#pb-progression-chart');
      await expect(pbCard).toBeVisible({
        timeout: 10000,
      });

      const drawerBtn = pbCard.locator('#pb-milestones-history-toggle');
      await drawerBtn.click();

      // Scoped to the drawer that owns the milestone filters region
      const drawer = pbCard.locator('div:has(> #pb-milestones-filters)');
      await expect(drawer).toBeVisible();

      // Filter by Single milestones
      const singleFilter = drawer.locator('#pb-milestone-filter-Single');
      await singleFilter.click();
      await expect(singleFilter).toHaveAttribute('aria-pressed', 'true');

      // Verify milestone rows are rendered in the list that follows the filters region
      const milestoneRows = drawer.locator('#pb-milestones-filters + div > div');
      expect(await milestoneRows.count()).toBeGreaterThan(0);

      // Close drawer
      await drawerBtn.click();
      await expect(drawer).toHaveCount(0);
    });

    test('interacts with DensityShiftChart on Tablet Portrait: drag scrubber and resize ribbed handle symmetrically', async ({
      page,
    }) => {
      await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('#density-shift-chart');
      await expect(densityCard).toBeVisible();

      // 3-column banner aligns in a single row on tablet portrait (768px >= 640px)
      const summaryItems = densityCard.locator('.grid > div');
      await expect(summaryItems).toHaveCount(3);
      const item0Box = await summaryItems.nth(0).boundingBox();
      const item2Box = await summaryItems.nth(2).boundingBox();
      if (!item0Box || !item2Box) throw new Error('Missing summary items bounding boxes');
      expect(Math.abs(item0Box.y - item2Box.y)).toBeLessThan(6);

      const scrubber1 = densityCard.locator('#density-scrubber-baseline');
      const scrubber2 = densityCard.locator('#density-scrubber-recent');

      // Drag right ribbed handle on Scrubber 1 to expand sample size symmetrically
      const rightHandle = densityCard.locator('#density-handle-baseline-end');
      const handleBox = await rightHandle.boundingBox();
      if (!handleBox) throw new Error('Missing resize handle bounding box');

      const s1BoxBefore = await scrubber1.boundingBox();
      const s2BoxBefore = await scrubber2.boundingBox();
      if (!s1BoxBefore || !s2BoxBefore) throw new Error('Missing scrubber bounding box');
      // Verify scrubber height is shrunk responsively on tablet portrait (track md:h-16 = 64px, inner scrubber = 62px)
      const track = densityCard.locator('#density-scrubber-track');
      const trackBox = await track.boundingBox();
      expect(trackBox).not.toBeNull();
      expect(Math.round(trackBox?.height ?? 0)).toBe(64);
      expect(Math.round(s1BoxBefore.height)).toBe(62);
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

    test('renders filename pill in Navbar and all 5 overview cards in a single row', async ({
      page,
    }) => {
      const header = page.locator('#navbar');

      // Filename is visible on lg: screens
      await expect(header.locator('#navbar-filename')).toBeVisible();

      // All 5 overview cards sit side-by-side on row 1
      const cardsGrid = page.locator('#metrics-overview');
      const cards = cardsGrid.locator('> div');
      await expect(cards).toHaveCount(5);

      const box0 = await cards.nth(0).boundingBox();
      const box4 = await cards.nth(4).boundingBox();
      if (!box0 || !box4) throw new Error('Missing card box');
      expect(Math.abs(box0.y - box4.y)).toBeLessThan(10);
    });

    test('renders DensityShiftChart and MetricsEvolutionChart as full-width stacked charts', async ({
      page,
    }) => {
      await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

      const densityHeading = page.locator('#density-shift-chart');
      const metricsHeading = page.locator('#metrics-evolution-chart');

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
      const card = page.locator('#progression-chart');
      const legendCount = () => card.locator('.recharts-legend-item-text').count();

      await expect.poll(legendCount).toBeGreaterThan(0);
      const initialCount = await legendCount();

      const customAoBtn = card.locator('#progression-custom-ao');
      await customAoBtn.click();

      const spinInput = card.locator('#progression-custom-ao-input');
      await expect(spinInput).toBeVisible();
      await spinInput.fill('35');
      await expect(spinInput).toHaveValue('35');
      await expect(customAoBtn).toHaveAttribute('aria-pressed', 'true');

      // Enabling the custom window adds exactly one series to the legend.
      await expect.poll(legendCount).toBe(initialCount + 1);
    });

    test('interacts with DensityShiftChart on Tablet Landscape: timeline track clicking and fullscreen modal view', async ({
      page,
    }) => {
      await page.locator('#deferred-density-shift').scrollIntoViewIfNeeded();

      const densityCard = page.locator('#density-shift-chart');
      await expect(densityCard).toBeVisible();

      const scrubber1 = densityCard.locator('#density-scrubber-baseline');
      const scrubber2 = densityCard.locator('#density-scrubber-recent');

      // Click track in the empty region between scrubbers to reposition closer scrubber
      await page.waitForTimeout(100);
      const track = densityCard.locator('#density-scrubber-track');
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
      const maxBtn = densityCard.locator('#density-shift-chart-maximize');
      await maxBtn.click();

      const modalBackdrop = page.locator('#chart-card-fullscreen-backdrop');
      await expect(modalBackdrop).toBeVisible();

      // Ensure chart, banner, and scrubbers are all rendered inside fullscreen modal
      await expect(modalBackdrop.locator('#density-scrubber-track')).toBeVisible();
      await expect(modalBackdrop.locator('#density-scrubber-baseline')).toBeVisible();

      // Exit fullscreen
      await page.keyboard.press('Escape');
      await expect(modalBackdrop).toHaveCount(0);
    });
  });
});
