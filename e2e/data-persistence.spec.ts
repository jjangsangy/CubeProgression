import path from 'node:path';
import { expect, test } from '@playwright/test';

test.describe('Data Ingestion & IndexedDB Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test to guarantee isolated state
    await page.goto('/');
    await page.evaluate(() => window.indexedDB.deleteDatabase('CubeProgressionDB'));
    await page.reload();

    // Wait until demo dataset completes initialization
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[aria-label="Upload csTimer file"]')).toBeEnabled({
      timeout: 15000,
    });
  });

  test('initializes demo dataset and saves to IndexedDB on first launch', async ({ page }) => {
    // Navbar indicates persistent local storage
    await expect(page.getByText('Saved locally')).toBeVisible();

    // Default session selector is populated with Session 1
    const sessionSelector = page.locator('#session-selector');
    await expect(sessionSelector).toHaveValue('session1');
    await expect(sessionSelector.locator('option')).toHaveCount(2);

    // Initial demo file pill is displayed in Navbar
    await expect(page.getByRole('banner').getByText('cstimer_demo_350solves.txt')).toBeVisible();

    // Main Progression Chart displays default session title
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible();
  });

  test('switches active session and recalculates charts', async ({ page }) => {
    const sessionSelector = page.locator('#session-selector');

    // Switch to Session 2 (3x3 General Solves)
    await sessionSelector.selectOption('session2');

    // Chart header updates immediately to reflect session 2's 150 solves
    await expect(page.getByText(/3x3 General Solves: Progression Over 150 Solves/)).toBeVisible();

    // Scroll to SolvesTable deferred container to mount it
    await page
      .locator(
        '[data-testid="deferred-chart-solves-table"], [data-testid="deferred-chart-skeleton"]',
      )
      .last()
      .scrollIntoViewIfNeeded();

    // Session solve log table header updates
    await expect(page.getByText('Session Solve Log (150 Total)')).toBeVisible();
  });

  test('switches grouping period and configures custom batch size', async ({ page }) => {
    // Switch to Weekly grouping
    const weeklyBtn = page.getByRole('button', { name: /^Weekly/i });
    await weeklyBtn.click();
    await expect(weeklyBtn).toHaveClass(/bg-amber-500\/15/);
    await page
      .locator(
        '[data-testid="deferred-chart-solve-time-distribution"], [data-testid="deferred-chart-skeleton"]',
      )
      .first()
      .scrollIntoViewIfNeeded();
    await expect(page.getByText('Weekly Solve Time Distribution & Variance')).toBeVisible();

    // Switch to By Solve Count (custom batch)
    const batchBtn = page.getByRole('button', { name: /^By Solve Count/i });
    await batchBtn.click();
    await expect(batchBtn).toHaveClass(/bg-amber-500\/15/);
    await expect(page.getByText('Solves per group:')).toBeVisible();

    // Select preset pill "25"
    const preset25Btn = page.getByRole('button', { name: '25', exact: true });
    await preset25Btn.click();
    await expect(preset25Btn).toHaveClass(/bg-amber-500/);

    // Verify number input reflects 25
    const customInput = page.getByRole('spinbutton');
    await expect(customInput).toHaveValue('25');

    // Type custom batch size 75
    await customInput.fill('75');
    await expect(page.getByText('75 solves per group')).toBeVisible();
  });

  test('uploads valid multi-session csTimer JSON file', async ({ page }) => {
    const fileInput = page.locator('input[aria-label="Upload csTimer file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-valid-multisession.json');

    await fileInput.setInputFiles(fixturePath);

    // Wait for upload processing to complete and storage banner to report saved solves
    await expect(
      page.getByText(/Saved 7 solves across 2 sessions to browser storage/i),
    ).toBeVisible({ timeout: 15000 });

    // Navbar shows uploaded filename
    await expect(
      page.getByRole('banner').getByText('cstimer-valid-multisession.json'),
    ).toBeVisible();

    // Dropdown contains both sessions from JSON
    const sessionSelector = page.locator('#session-selector');
    const options = sessionSelector.locator('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText('Main 3x3 CFOP (5 solves)');
    await expect(options.nth(1)).toContainText('One-Handed Practice (2 solves)');

    // Progression chart renders newly uploaded session
    await expect(page.getByText(/Main 3x3 CFOP: Progression Over 5 Solves/)).toBeVisible();
  });

  test('persists uploaded data, active session, and grouping across hard reload', async ({
    page,
  }) => {
    // 1. Upload multi-session fixture
    const fileInput = page.locator('input[aria-label="Upload csTimer file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-valid-multisession.json');
    await fileInput.setInputFiles(fixturePath);
    await expect(
      page.getByText(/Saved 7 solves across 2 sessions to browser storage/i),
    ).toBeVisible({ timeout: 15000 });

    // 2. Select second session ("One-Handed Practice")
    await page.locator('#session-selector').selectOption('session2');
    await expect(page.getByText(/One-Handed Practice: Progression Over 2 Solves/)).toBeVisible();

    // 3. Switch grouping to Monthly
    const monthlyBtn = page.getByRole('button', { name: /^Monthly/i });
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveClass(/bg-amber-500\/15/);
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

    // 5. Verify rehydrated state from IndexedDB
    await expect(page.getByText(/Restored 7 solves across 2 sessions from IndexedDB/i)).toBeVisible(
      { timeout: 15000 },
    );
    await expect(page.locator('#session-selector')).toHaveValue('session2');
    await expect(page.getByText(/One-Handed Practice: Progression Over 2 Solves/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Monthly/i })).toHaveClass(/bg-amber-500\/15/);
    await expect(
      page.getByRole('banner').getByText('cstimer-valid-multisession.json'),
    ).toBeVisible();
  });

  test('clears saved storage and resets application state', async ({ page }) => {
    // Click Clear Saved Storage in FileUploader
    const clearBtn = page.getByRole('button', { name: 'Clear Saved Storage' });
    await clearBtn.click();

    // Dashboard elements unmount; session selector options are cleared
    await expect(page.locator('#session-selector option')).toHaveCount(0);
    await expect(page.getByText('Best Single', { exact: true })).not.toBeVisible();

    // Dropzone displays browse prompt
    await expect(page.getByText('Upload cstimer.txt or .json')).toBeVisible();

    // Reloading after clear falls back to clean state or freshly generated demo data
    await page.reload();
    await expect(page.getByRole('heading', { name: 'CubeProgression' })).toBeVisible();
  });

  test('shows graceful error banner when uploading corrupted file', async ({ page }) => {
    const fileInput = page.locator('input[aria-label="Upload csTimer file"]');
    const fixturePath = path.resolve('e2e/fixtures/cstimer-corrupted.txt');

    await fileInput.setInputFiles(fixturePath);

    // Error banner appears
    await expect(page.getByText(/Invalid csTimer file format/i)).toBeVisible({ timeout: 15000 });

    // Previous dashboard remains intact without crashing
    await expect(page.locator('#session-selector')).toBeVisible();
  });

  test('triggers CSV export download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    const exportBtn = page.getByTitle('Export Period Summary Stats as CSV');

    await exportBtn.click();
    const download = await downloadPromise;

    // Verify downloaded CSV filename format
    expect(download.suggestedFilename()).toMatch(/.*_period_stats\.csv$/);
  });
});
