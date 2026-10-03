import { expect, test } from '@playwright/test';

test.describe('csTimer Instruction Modal E2E & Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Await page readiness and initial sample data load
    await expect(page.getByText(/Upload cstimer/i)).toBeVisible({ timeout: 15000 });
  });

  test('opens from Navbar "Export Guide" button, verifies accessibility, body scroll lock, and closes via close button', async ({
    page,
  }) => {
    const navbar = page.locator('header');
    const guideBtn = navbar.getByRole('button', { name: 'Export Guide' });
    await expect(guideBtn).toBeVisible();
    await guideBtn.click();

    // Verify modal dialog accessibility roles and visibility
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'instruction-modal-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'instruction-modal-description');
    await expect(page.getByRole('heading', { name: 'How to Export from csTimer' })).toBeVisible();

    // Verify body scroll lock is engaged
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Verify visual walkthrough image loaded with valid natural dimensions
    const guideImg = dialog.getByAltText(/csTimer export walkthrough/i);
    await expect(guideImg).toBeVisible();
    const naturalWidth = await guideImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // Close via 'X' button
    const closeBtn = dialog.getByRole('button', { name: 'Close instructions modal' });
    await closeBtn.click();

    // Verify modal dismissed and scroll lock released
    await expect(dialog).toHaveCount(0);
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('opens from FileUploader button, verifies external link security, and closes via footer "Got it" button', async ({
    page,
  }) => {
    const uploaderHelpBtn = page.getByRole('button', {
      name: 'How to export from csTimer?',
    });
    await expect(uploaderHelpBtn).toBeVisible();
    await uploaderHelpBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify external link attributes
    const externalLink = dialog.getByRole('link', { name: /Open csTimer\.net/i });
    await expect(externalLink).toHaveAttribute('href', 'https://cstimer.net');
    await expect(externalLink).toHaveAttribute('target', '_blank');
    await expect(externalLink).toHaveAttribute('rel', /noopener/);

    // Dismiss via "Got it" button
    const gotItBtn = dialog.getByRole('button', { name: 'Got it' });
    await gotItBtn.click();

    await expect(dialog).toHaveCount(0);
  });

  test('closes modal via backdrop overlay click and Keyboard Escape key', async ({ page }) => {
    const navbar = page.locator('header');
    const guideBtn = navbar.getByRole('button', { name: 'Export Guide' });

    // 1. Test backdrop click dismiss
    await guideBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const backdrop = page.getByRole('button', { name: 'Close modal overlay' });
    await backdrop.click({ position: { x: 10, y: 10 } });
    await expect(dialog).toHaveCount(0);

    // 2. Test Escape key dismiss
    await guideBtn.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('maintains responsive layout on mobile landscape (844x390) without viewport overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });

    const navbar = page.locator('header');
    const guideBtn = navbar.getByRole('button', { name: 'Export Guide' });
    await guideBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    if (dialogBox) {
      // Must fit within the 390px viewport height with safe margins
      expect(dialogBox.height).toBeLessThanOrEqual(390);
      expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    }

    // Verify footer button remains visible and clickable despite constrained vertical space
    const gotItBtn = dialog.getByRole('button', { name: 'Got it' });
    await expect(gotItBtn).toBeInViewport();
    await gotItBtn.click();
    await expect(dialog).toHaveCount(0);
  });
});
