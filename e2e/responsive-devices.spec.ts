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
            const loadingContainer = dropzone.querySelector(
              '.cursor-wait div.flex.w-full.flex-col',
            );
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

      // Fullscreen backdrop overlay is visible
      const modal = page.locator('.fixed.inset-0.z-\\[100\\]');
      await expect(modal).toBeVisible();

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
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

    test('renders DensityShiftChart and MetricsEvolutionChart side-by-side in 2-column grid', async ({
      page,
    }) => {
      const densityHeading = page.getByRole('heading', { name: /Time Distribution Shift/i });
      const metricsHeading = page.getByRole('heading', { name: /Metrics Evolution/i });

      await expect(densityHeading).toBeVisible();
      await expect(metricsHeading).toBeVisible();

      const boxDensity = await densityHeading.boundingBox();
      const boxMetrics = await metricsHeading.boundingBox();
      if (!boxDensity || !boxMetrics) throw new Error('Missing heading box');

      // Side-by-side: approximately same vertical position and horizontal offset
      expect(Math.abs(boxDensity.y - boxMetrics.y)).toBeLessThan(25);
      expect(boxMetrics.x).toBeGreaterThan(boxDensity.x + 200);
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
  });
});
