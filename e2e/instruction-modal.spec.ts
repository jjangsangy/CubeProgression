import { expect, test } from '@playwright/test';

test.describe('csTimer Instruction Modal E2E & Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Await page readiness and initial sample data load
    await expect(page.locator('#file-uploader')).toBeVisible({ timeout: 15000 });
  });

  test('opens from Navbar "csTimer Guide" button, verifies accessibility, body scroll lock, and closes via close button', async ({
    page,
  }) => {
    const guideBtn = page.locator('#navbar-guide');
    await expect(guideBtn).toBeVisible();
    await guideBtn.click();

    // Verify modal dialog accessibility roles and visibility
    const dialog = page.locator('#instruction-modal [role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'instruction-modal-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'instruction-modal-description');

    // Verify body scroll lock is engaged
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Verify visual walkthrough image loaded with valid natural dimensions
    const guideImg = dialog.locator('img');
    await expect(guideImg).toBeVisible();
    const naturalWidth = await guideImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // Close via 'X' button
    const closeBtn = page.locator('#instruction-modal-close');
    await closeBtn.click();

    // Verify modal dismissed and scroll lock released
    await expect(dialog).toHaveCount(0);
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).toBe('');
  });

  test('opens from FileUploader button, verifies external link security, and closes via footer "Got it" button', async ({
    page,
  }) => {
    const uploaderHelpBtn = page.locator('#export-guide');
    await expect(uploaderHelpBtn).toBeVisible();
    await uploaderHelpBtn.click();

    const dialog = page.locator('#instruction-modal [role="dialog"]');
    await expect(dialog).toBeVisible();

    // Verify every external link is secure
    const externalLinks = dialog.locator('a[href*="cstimer.net"]');
    await expect(externalLinks).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(externalLinks.nth(i)).toHaveAttribute('href', 'https://cstimer.net');
      await expect(externalLinks.nth(i)).toHaveAttribute('target', '_blank');
      await expect(externalLinks.nth(i)).toHaveAttribute('rel', /noopener/);
    }

    // Dismiss via the footer confirm button
    await dialog.locator('#instruction-modal-confirm').click();

    await expect(dialog).toHaveCount(0);
  });

  test('closes modal via backdrop overlay click and Keyboard Escape key', async ({ page }) => {
    const guideBtn = page.locator('#navbar-guide');

    // 1. Test backdrop click dismiss
    await guideBtn.click();
    const dialog = page.locator('#instruction-modal [role="dialog"]');
    await expect(dialog).toBeVisible();

    const backdrop = page.locator('#instruction-modal-overlay');
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

    const guideBtn = page.locator('#navbar-guide');
    await guideBtn.click();

    const dialog = page.locator('#instruction-modal [role="dialog"]');
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    if (dialogBox) {
      // Must fit within the 390px viewport height with safe margins
      expect(dialogBox.height).toBeLessThanOrEqual(390);
      expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    }

    // Verify footer button remains visible and clickable despite constrained vertical space
    const gotItBtn = dialog.locator('#instruction-modal-confirm');
    await expect(gotItBtn).toBeInViewport();
    await gotItBtn.click();
    await expect(dialog).toHaveCount(0);
  });
});
