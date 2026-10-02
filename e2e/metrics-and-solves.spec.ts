import { expect, type Page, test } from '@playwright/test';

test.describe('Metrics Overview & Solves Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Await initial demo dataset load
    await expect(
      page.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).toBeVisible({ timeout: 15000 });
  });

  const scrollToSolvesTable = async (page: Page) => {
    await page.getByTestId('deferred-chart-solves-table').scrollIntoViewIfNeeded();
    await expect(page.getByText(/Session Solve Log \(\d+ Total\)/)).toBeVisible({
      timeout: 10000,
    });
  };

  test('displays all 5 global metric overview cards with formatted stats', async ({ page }) => {
    const overviewGrid = page.locator('.grid.grid-cols-1.gap-4');

    // 1. Best Single Card
    const bestSingleCard = overviewGrid.locator('div.rounded-2xl', { hasText: 'Best Single' });
    await expect(bestSingleCard).toBeVisible();
    await expect(bestSingleCard.locator('.font-mono.text-2xl')).toHaveText(/\d+\.\d{2}s/);
    await expect(bestSingleCard).toContainText(/Achieved on \d{4}-\d{2}-\d{2}/);

    // 2. Best Averages Card
    const bestAveragesCard = overviewGrid.locator('div.rounded-2xl', { hasText: 'Best Averages' });
    await expect(bestAveragesCard).toBeVisible();
    await expect(bestAveragesCard.getByText('Ao12')).toBeVisible();
    await expect(bestAveragesCard.getByText('Ao50')).toBeVisible();

    // 3. Overall Rate Card
    const overallRateCard = overviewGrid.locator('div.rounded-2xl', { hasText: 'Overall Rate' });
    await expect(overallRateCard).toBeVisible();
    await expect(overallRateCard).toContainText('s/solve');
    await expect(overallRateCard).toContainText('Linear OLS trend rate');

    // 4. Progression Gain Card
    const progressionGainCard = overviewGrid.locator('div.rounded-2xl', {
      hasText: 'Progression Gain',
    });
    await expect(progressionGainCard).toBeVisible();
    await expect(progressionGainCard).toContainText(/Baseline .* vs Recent/);

    // 5. Session Solves Card
    const sessionSolvesCard = overviewGrid.locator('div.rounded-2xl', {
      hasText: 'Session Solves',
    });
    await expect(sessionSolvesCard).toBeVisible();
    await expect(sessionSolvesCard).toContainText('350 solves');
    await expect(sessionSolvesCard).toContainText(/DNFs • Mean \d+(\.\d+)?s/);
  });

  test('renders solve log table with 15 rows, correct columns, and pagination', async ({
    page,
  }) => {
    await scrollToSolvesTable(page);

    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verify all 8 column headers
    const headers = table.locator('thead th');
    await expect(headers).toHaveText([
      '#',
      'Time',
      'Ao5',
      'Ao12',
      'Ao50',
      'Ao100',
      'Date',
      'Scramble',
    ]);

    // Page 1 displays exactly 15 solve rows
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(15);

    // First solve row has index 1
    const firstRow = rows.first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('1');
    await expect(firstRow.locator('td').nth(1)).toHaveText(/\d+\.\d{2}s/);

    // Pagination info for 350 solves (15 per page = 24 pages)
    await expect(page.getByText('Showing 1 to 15 of 350 solves')).toBeVisible();
    await expect(page.getByText('1 / 24')).toBeVisible();
  });

  test('navigates pagination next and previous pages', async ({ page }) => {
    await scrollToSolvesTable(page);

    const prevBtn = page.getByRole('button', { name: 'Previous page' });
    const nextBtn = page.getByRole('button', { name: 'Next page' });

    // Initial state: Prev disabled, Next enabled
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // Click Next to reach page 2
    await nextBtn.click();
    await expect(page.getByText('Showing 16 to 30 of 350 solves')).toBeVisible();
    await expect(page.getByText('2 / 24')).toBeVisible();
    await expect(prevBtn).toBeEnabled();

    // Solve number in first row on page 2 should be 16
    const firstRowPage2 = page.locator('tbody tr').first();
    await expect(firstRowPage2.locator('td').nth(0)).toHaveText('16');

    // Click Prev to return to page 1
    await prevBtn.click();
    await expect(page.getByText('Showing 1 to 15 of 350 solves')).toBeVisible();
    await expect(page.getByText('1 / 24')).toBeVisible();
    await expect(prevBtn).toBeDisabled();
  });

  test('filters solves by search query and resets pagination to page 1', async ({ page }) => {
    await scrollToSolvesTable(page);

    const nextBtn = page.getByRole('button', { name: 'Next page' });

    // Navigate to page 2 first
    await nextBtn.click();
    await expect(page.getByText('2 / 24')).toBeVisible();

    // Search for a specific query
    const searchInput = page.getByPlaceholder('Search solves or scrambles...');
    await searchInput.fill('349');

    // Pagination immediately resets from page 2 to page 1
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
    await expect(page.getByText('Showing 1 to 15 of 350 solves')).not.toBeVisible();

    // Clear search and verify full dataset returns
    await searchInput.clear();
    await expect(page.getByText('Showing 1 to 15 of 350 solves')).toBeVisible();
    await expect(page.getByText('1 / 24')).toBeVisible();
  });

  test('shows empty state message when search query does not match any solves', async ({
    page,
  }) => {
    await scrollToSolvesTable(page);

    const searchInput = page.getByPlaceholder('Search solves or scrambles...');
    await searchInput.fill('nonexistent-query-string-999');

    await expect(page.getByText('No solves found matching your query.')).toBeVisible();
    await expect(page.getByText('Showing 0 to 0 of 0 solves')).toBeVisible();
    await expect(page.getByText('1 / 1')).toBeVisible();

    const prevBtn = page.getByRole('button', { name: 'Previous page' });
    const nextBtn = page.getByRole('button', { name: 'Next page' });
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeDisabled();
  });

  test('renders DNF and (+2) penalty badges accurately', async ({ page }) => {
    await scrollToSolvesTable(page);

    const searchInput = page.getByPlaceholder('Search solves or scrambles...');

    // Search for DNF solves in demo data
    await searchInput.fill('DNF');
    const dnfRows = page.locator('tbody tr', { has: page.getByText('DNF') });
    await expect(dnfRows.first()).toBeVisible();
    await expect(dnfRows.first().locator('td').nth(1)).toContainText('DNF');

    // Search for (+2) penalized solves
    await searchInput.fill('+2');
    const plusTwoRows = page.locator('tbody tr', { has: page.getByText('(+2)') });
    await expect(plusTwoRows.first()).toBeVisible();
    await expect(plusTwoRows.first().locator('td').nth(1)).toContainText('(+2)');
  });

  test('updates metrics cards and table when session changes', async ({ page }) => {
    const sessionSelector = page.locator('#session-selector');
    await sessionSelector.selectOption('session2');

    // Session solves card updates to 150 solves
    const overviewGrid = page.locator('.grid.grid-cols-1.gap-4');
    const sessionSolvesCard = overviewGrid.locator('div.rounded-2xl', {
      hasText: 'Session Solves',
    });
    await expect(sessionSolvesCard).toContainText('150 solves');

    // Table header and pagination reflect 150 solves (10 pages)
    await scrollToSolvesTable(page);
    await expect(page.getByText('Session Solve Log (150 Total)')).toBeVisible();
    await expect(page.getByText('Showing 1 to 15 of 150 solves')).toBeVisible();
    await expect(page.getByText('1 / 10')).toBeVisible();
  });
});
