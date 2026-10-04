import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const assertPagination = async (page: Page, expected: string) => {
  await expect
    .poll(async () => (await page.locator('#pagination-indicator').textContent())?.trim())
    .toBe(expected);
};

test.describe('Data Ingestion & IndexedDB Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test to guarantee isolated state
    await page.goto('/');
    await page.evaluate(() => window.indexedDB.deleteDatabase('CubeProgressionDB'));
    await page.reload();

    // Wait until demo dataset completes initialization
    await expect(page.locator('#session-selector')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#session-selector')).toHaveValue('session1');
    await expect(page.locator('#file-uploader input[type="file"]')).toBeEnabled({
      timeout: 15000,
    });
  });

  test('initializes demo dataset and saves to IndexedDB on first launch', async ({ page }) => {
    // Navbar indicates persistent local storage
    await expect(page.locator('#navbar-saved-badge')).toBeVisible();

    // Default session selector is populated with two sessions
    const sessionSelector = page.locator('#session-selector');
    await expect(sessionSelector).toHaveValue('session1');
    await expect(sessionSelector.locator('option')).toHaveCount(2);

    // Main progression chart renders
    await expect(page.locator('#progression-chart')).toBeVisible();
  });

  test('switches active session and recalculates charts', async ({ page }) => {
    const sessionSelector = page.locator('#session-selector');

    // Switch to Session 2 (3x3 General Solves)
    await sessionSelector.selectOption('session2');
    await expect(sessionSelector).toHaveValue('session2');

    // Scroll to SolvesTable deferred container to mount it
    // Session solve log pagination reflects session 2's 150 solves (10 pages of 15)
    await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
    await assertPagination(page, '1 / 10');
  });

  test('switches grouping period and configures custom batch size', async ({ page }) => {
    const dailyBtn = page.locator('#file-uploader #grouping-daily');
    const weeklyBtn = page.locator('#file-uploader #grouping-weekly');

    // Daily is active by default; switching to Weekly moves the pressed state
    await expect(dailyBtn).toHaveAttribute('aria-pressed', 'true');
    await weeklyBtn.click();
    await expect(weeklyBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(dailyBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to By Solve Count (custom batch)
    const batchBtn = page.locator('#file-uploader #grouping-customBatch');
    await batchBtn.click();
    await expect(batchBtn).toHaveAttribute('aria-pressed', 'true');

    const customInput = page.locator('#file-uploader input[type="number"]');
    await expect(customInput).toBeVisible();

    // Select preset pill "25" -> input reflects it
    const preset25Btn = page.locator('#file-uploader #batch-preset-25');
    await preset25Btn.click();
    await expect(customInput).toHaveValue('25');

    // Type custom batch size 75
    await customInput.fill('75');
    await expect(customInput).toHaveValue('75');
  });

  test('uploads valid multi-session csTimer JSON file', async ({ page }) => {
    const fileInput = page.locator('#file-uploader input[type="file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-valid-multisession.json');

    await fileInput.setInputFiles(fixturePath);

    // The uploaded fixture replaces the demo dataset; its 5-solve session renders a single
    // page of solves (the demo has 350), which distinguishes the upload from the initial data.
    const sessionSelector = page.locator('#session-selector');
    await expect(sessionSelector).toHaveCount(1);
    await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
    await assertPagination(page, '1 / 1');
  });

  test('persists uploaded data, active session, and grouping across hard reload', async ({
    page,
  }) => {
    // 1. Upload multi-session fixture
    const fileInput = page.locator('#file-uploader input[type="file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-valid-multisession.json');
    await fileInput.setInputFiles(fixturePath);
    await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
    await assertPagination(page, '1 / 1');

    // 2. Select second session ("One-Handed Practice")
    await page.locator('#session-selector').selectOption('session2');
    await expect(page.locator('#session-selector')).toHaveValue('session2');

    // 3. Switch grouping to Monthly
    const monthlyBtn = page.locator('#file-uploader #grouping-monthly');
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveAttribute('aria-pressed', 'true');
    // Wait deterministically until IndexedDB transaction commits the groupingPeriod update
    await expect
      .poll(async () => {
        return await page.evaluate(async () => {
          return new Promise<string | null>((resolve) => {
            const req = indexedDB.open('CubeProgressionDB', 1);
            req.onsuccess = () => {
              const db = req.result;
              const tx = db.transaction('datasets', 'readonly');
              const getReq = tx.objectStore('datasets').get('active_dataset');
              getReq.onsuccess = () => resolve(getReq.result?.groupingPeriod ?? null);
              getReq.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
          });
        });
      })
      .toBe('monthly');

    // 4. Hard reload the page
    await page.reload();

    // 5. Verify rehydrated state from IndexedDB without any text assertions
    await expect(page.locator('#session-selector')).toHaveValue('session2');
    await expect(page.locator('#file-uploader #grouping-monthly')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Session 2 has 2 solves -> single page
    await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
    await assertPagination(page, '1 / 1');
  });

  test('clears saved storage and resets application state', async ({ page }) => {
    // Click Clear Saved Storage in FileUploader
    const clearBtn = page.locator('#clear-saved-storage');
    await clearBtn.click();

    // Dashboard elements unmount; session selector options are cleared
    await expect(page.locator('#session-selector option')).toHaveCount(0);
    await expect(page.locator('#metrics-overview')).not.toBeVisible();

    // Reloading after clear falls back to clean state or freshly generated demo data
    await page.reload();
    await expect(page.locator('#navbar h1')).toBeVisible();
  });

  test('shows graceful error banner when uploading corrupted file', async ({ page }) => {
    const fileInput = page.locator('#file-uploader input[type="file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-corrupted.txt');

    await fileInput.setInputFiles(fixturePath);

    // Error banner appears
    await expect(page.locator('#file-uploader [role="alert"]')).toBeVisible({ timeout: 15000 });

    // Previous dashboard remains intact without crashing
    await expect(page.locator('#session-selector')).toBeVisible();
    await expect(page.locator('#session-selector option')).toHaveCount(2);
  });
});
