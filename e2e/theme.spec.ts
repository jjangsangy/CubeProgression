import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'cubeprogression_theme';

test.describe('Theme Selector & Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();

    // Wait for the app shell (and the theme provider effect) to settle.
    await expect(page.locator('#theme-selector-btn')).toBeVisible({ timeout: 15000 });
  });

  test('defaults to the dark theme and toggles the dropdown open and closed', async ({ page }) => {
    const trigger = page.locator('#theme-selector-btn');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#theme-dropdown-menu')).toHaveCount(0);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#theme-dropdown-menu')).toBeVisible();
    await expect(page.locator('[id^="theme-option-"]')).toHaveCount(15);
    await expect(page.locator('#theme-option-dark')).toHaveAttribute('aria-selected', 'true');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#theme-dropdown-menu')).toHaveCount(0);
  });

  test('applies a light theme to the document and persists it across a hard reload', async ({
    page,
  }) => {
    const trigger = page.locator('#theme-selector-btn');
    await trigger.click();
    await page.locator('#theme-option-light').click();

    // Selecting closes the menu and flips the document-level theme attributes.
    await expect(page.locator('#theme-dropdown-menu')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light');

    // The light theme must repaint the page canvas, not just set attributes.
    const canvasColor = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    expect(canvasColor).toBe('rgb(248, 250, 252)');

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const reloadedTrigger = page.locator('#theme-selector-btn');
    await expect(reloadedTrigger).toHaveAttribute('aria-expanded', 'false');

    // Reopening the menu reflects the persisted selection.
    await reloadedTrigger.click();
    await expect(page.locator('#theme-option-light')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#theme-option-dark')).toHaveAttribute('aria-selected', 'false');
  });

  test('switches back to the dark theme after a light selection', async ({ page }) => {
    const trigger = page.locator('#theme-selector-btn');

    await trigger.click();
    await page.locator('#theme-option-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light');

    await trigger.click();
    await page.locator('#theme-option-dark').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark');
  });
});
