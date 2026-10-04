import { expect, type Page, test } from '@playwright/test';

test.describe('Metrics Overview & Solves Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Await initial demo dataset load
    await expect(page.locator('#progression-chart')).toBeVisible({ timeout: 15000 });
  });

  const scrollToSolvesTable = async (page: Page) => {
    await page.locator('#deferred-solves-table').scrollIntoViewIfNeeded();
    await expect(page.locator('#solves-table')).toBeVisible({
      timeout: 10000,
    });
  };

  const assertPagination = async (page: Page, expected: string) => {
    await expect
      .poll(async () => (await page.locator('#pagination-indicator').textContent())?.trim())
      .toBe(expected);
  };

  test('displays all 5 global metric overview cards with formatted stats', async ({ page }) => {
    const cards = page.locator('#metrics-overview > div');
    await expect(cards).toHaveCount(5);

    const readouts = async (cardId: string) =>
      (await page.locator(`#${cardId} .font-mono`).allTextContents()).map((text) => text.trim());

    // Best Single renders a 2-decimal second value.
    expect((await readouts('metric-best-single')).some((t) => /^\d+\.\d{2}s$/.test(t))).toBe(true);

    // Best Averages renders both rolling-average values (Ao12 and Ao50).
    expect(
      (await readouts('metric-best-averages')).filter((t) => /^\d+\.\d{2}s$/.test(t)).length,
    ).toBeGreaterThanOrEqual(2);

    // Overall Rate renders a signed per-solve regression slope.
    expect(
      (await readouts('metric-overall-rate')).some((t) => /^[-+]\d+\.\d{4}s\/solve$/.test(t)),
    ).toBe(true);

    // Progression Gain renders a signed seconds delta.
    expect(
      (await readouts('metric-progression-gain')).some((t) => /^[-+]?\d+\.\d+s\b/.test(t)),
    ).toBe(true);

    // Session Solves renders the solve count.
    expect((await readouts('metric-session-solves')).some((t) => /^\d+\s*solves$/.test(t))).toBe(
      true,
    );
  });

  test('renders solve log table with 15 rows, correct columns, and pagination', async ({
    page,
  }) => {
    await scrollToSolvesTable(page);

    const table = page.locator('#solves-table table');
    await expect(table).toBeVisible();

    // Verify the table exposes all 8 columns
    const headers = table.locator('thead th');
    await expect(headers).toHaveCount(8);

    // Page 1 displays exactly 15 solve rows
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(15);

    // First solve row has index 1 and a fixed 2-decimal second time
    const firstRow = rows.first();
    const firstRowCells = firstRow.locator('td');
    expect((await firstRowCells.nth(0).textContent())?.trim()).toBe('1');
    expect((await firstRowCells.nth(1).textContent())?.trim()).toMatch(/\d+\.\d{2}s/);

    // Pagination info for 350 solves (15 per page = 24 pages)
    await assertPagination(page, '1 / 24');
  });

  test('navigates pagination next and previous pages', async ({ page }) => {
    await scrollToSolvesTable(page);

    const prevBtn = page.locator('#solves-prev-page');
    const nextBtn = page.locator('#solves-next-page');

    // Initial state: Prev disabled, Next enabled
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // Click Next to reach page 2
    await nextBtn.click();
    await assertPagination(page, '2 / 24');
    await expect(prevBtn).toBeEnabled();

    // Solve number in first row on page 2 should be 16
    const firstRowPage2 = page.locator('#solves-table tbody tr').first();
    expect((await firstRowPage2.locator('td').nth(0).textContent())?.trim()).toBe('16');

    // Click Prev to return to page 1
    await prevBtn.click();
    await assertPagination(page, '1 / 24');
    await expect(prevBtn).toBeDisabled();
  });

  test('filters solves by search query and resets pagination to page 1', async ({ page }) => {
    await scrollToSolvesTable(page);

    const nextBtn = page.locator('#solves-next-page');

    // Navigate to page 2 first
    await nextBtn.click();
    await assertPagination(page, '2 / 24');

    // Search for a specific query
    const searchInput = page.locator('#solves-search');
    await searchInput.fill('349');

    // Pagination immediately resets from page 2 to page 1
    await expect
      .poll(async () => (await page.locator('#pagination-indicator').textContent())?.trim())
      .toMatch(/^1 \//);

    // Clear search and verify full dataset returns
    await searchInput.clear();
    await assertPagination(page, '1 / 24');
  });

  test('shows empty state message when search query does not match any solves', async ({
    page,
  }) => {
    await scrollToSolvesTable(page);

    const searchInput = page.locator('#solves-search');
    await searchInput.fill('nonexistent-query-string-999');

    const emptyCell = page.locator('#solves-table tbody td');
    await expect(emptyCell).toHaveAttribute('colspan', '8');

    const prevBtn = page.locator('#solves-prev-page');
    const nextBtn = page.locator('#solves-next-page');
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeDisabled();
  });

  test('renders DNF and (+2) penalty badges accurately', async ({ page }) => {
    await scrollToSolvesTable(page);

    const searchInput = page.locator('#solves-search');

    // Search for DNF solves in demo data and confirm a penalty cell reports DNF
    await searchInput.fill('DNF');
    await expect
      .poll(async () => {
        const penaltyCells = await page
          .locator('#solves-table tbody tr td:nth-child(2)')
          .allTextContents();
        return penaltyCells.some((text) => /DNF/.test(text));
      })
      .toBe(true);

    // Search for (+2) penalized solves and confirm a penalty cell reports (+2)
    await searchInput.fill('+2');
    await expect
      .poll(async () => {
        const penaltyCells = await page
          .locator('#solves-table tbody tr td:nth-child(2)')
          .allTextContents();
        return penaltyCells.some((text) => /\(\+2\)/.test(text));
      })
      .toBe(true);
  });

  test('updates metrics cards and table when session changes', async ({ page }) => {
    const sessionSelector = page.locator('#session-selector');
    await sessionSelector.selectOption('session2');
    await expect(sessionSelector).toHaveValue('session2');

    // Session Solves card reflects session 2's 150 solves.
    await expect
      .poll(async () =>
        (await page.locator('#metric-session-solves .font-mono').textContent())?.trim(),
      )
      .toMatch(/^150\s*solves$/);

    // Table pagination reflects 150 solves (10 pages)
    await scrollToSolvesTable(page);
    await assertPagination(page, '1 / 10');
  });
});
