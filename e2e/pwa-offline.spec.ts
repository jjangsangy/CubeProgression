import { expect, test } from '@playwright/test';

test.describe('PWA & Offline Capability', () => {
  test('serves a valid Web App Manifest with required PWA metadata and icons', async ({
    page,
    request,
  }) => {
    await page.goto('/');

    // Verify manifest link tag in HTML
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();

    // Fetch and validate manifest contents
    const response = await request.get(manifestHref as string);
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('Speedcubing Progression Analyzer');
    expect(manifest.short_name).toBe('CubeProgression');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.theme_color).toBe('#0c0a09');
    expect(manifest.background_color).toBe('#0c0a09');

    // Verify icons exist and are accessible
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const iconSrcs = manifest.icons.map((icon: { src: string }) => icon.src);
    expect(iconSrcs).toContain('./favicon.svg');
    expect(iconSrcs).toContain('./pwa-192x192.png');
    expect(iconSrcs).toContain('./pwa-512x512.png');
    expect(iconSrcs).toContain('./pwa-maskable-512x512.png');

    for (const src of iconSrcs) {
      const iconRes = await request.get(src);
      expect(iconRes.status()).toBe(200);
    }
  });

  test('contains iOS Safari and mobile PWA meta tags in HTML', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    await expect(
      page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
    ).toHaveAttribute('content', 'black-translucent');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
      'content',
      'CubeProgression',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      './apple-touch-icon.png',
    );
  });

  test('registers Service Worker and functions seamlessly in offline mode', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    // Wait until demo dataset completes initialization
    await expect(page.locator('#session-selector')).toBeVisible({ timeout: 15000 });

    // Wait for Service Worker registration to become ready (with timeout protection against dev-mode hangs)
    const isSwRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const swPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000),
        );
        const reg = await Promise.race([swPromise, timeoutPromise]);
        return reg !== null;
      } catch {
        return false;
      }
    });
    expect(isSwRegistered).toBe(true);

    // Verify Cache Storage contains cubeprogression cache
    const cacheNames = await page.evaluate(async () => {
      return await window.caches.keys();
    });
    const pwaCache = cacheNames.find((name) => name.startsWith('cubeprogression-v-'));
    expect(pwaCache).toBeDefined();

    // Go offline
    await context.setOffline(true);

    // Trigger offline window event to verify UI badge
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByRole('status', { name: 'Offline mode' })).toBeVisible();

    // Reload the page while completely offline
    await page.reload();

    // App should successfully reload from Service Worker cache and render UI
    await expect(page.locator('#session-selector')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('CubeProgression')).toBeVisible();
    await expect(page.getByRole('status', { name: 'Offline mode' })).toBeVisible();

    // Verify charts and data table successfully render from offline cache
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 10000 });
    await page.getByTestId('deferred-chart-solves-table').scrollIntoViewIfNeeded();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Restore online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('status', { name: 'Offline mode' })).not.toBeVisible();
  });
});
