import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PLAYWRIGHT_PORT || '3200';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel across workers */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. Overridable via PLAYWRIGHT_WORKERS or --workers CLI flag. */
  workers: process.env.CI
    ? 1
    : process.env.PLAYWRIGHT_WORKERS
      ? Number(process.env.PLAYWRIGHT_WORKERS)
      : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Headless mode */
    headless: true,

    /* Deterministic timezone */
    timezoneId: 'UTC',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--mute-audio',
            '--js-flags=--max-old-space-size=512',
          ],
        },
      },
    },
  ],

  /* Run a lightweight preview build by default on port 3200 to minimize memory overhead compared to dev server.
   * Reuses existing server if already running on port 3200. Set E2E_DEV=true to force dev server. */
  webServer: {
    command: process.env.E2E_DEV
      ? `bun run vite --port=${PORT} --host=0.0.0.0`
      : `bun run build && bun run vite preview --port=${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
