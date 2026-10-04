import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 3250;
const URL = `http://localhost:${PORT}`;

function isServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const running = await isServerRunning();
  if (running) return null;

  const server = spawn('bun', ['run', 'vite', 'preview', `--port=${PORT}`], {
    stdio: 'ignore',
    detached: true,
  });
  server.unref();

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await isServerRunning()) {
      return server;
    }
  }
  throw new Error('Server failed to start');
}

async function main() {
  const positionalArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const width = parseInt(positionalArgs[0] || '390', 10);
  const height = parseInt(positionalArgs[1] || '844', 10);
  const rawOutName = positionalArgs[2] || `mobile_${width}x${height}.png`;
  const selector = positionalArgs[3] || null;

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  mkdirSync(screenshotsDir, { recursive: true });

  const outName =
    path.isAbsolute(rawOutName) || rawOutName.includes('/')
      ? rawOutName
      : path.join(screenshotsDir, rawOutName);

  await ensureServer();

  const themeArg = process.argv.find((a) => a.startsWith('--theme='));
  const themeName = themeArg ? themeArg.split('=')[1] : null;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });

  if (themeName) {
    await page.addInitScript((theme) => {
      localStorage.setItem('cubeprogression_theme', theme);
    }, themeName);
  }

  await page.goto(URL, { waitUntil: 'networkidle' });
  // Wait for demo dataset and dashboard to load
  await page.waitForSelector('#dashboard-view', { timeout: 15000 });
  await page.waitForSelector('#progression-chart', { timeout: 15000 });
  await page.waitForSelector('#file-uploader', { timeout: 15000 });

  // Scroll through all deferred chart sections to ensure all IntersectionObservers trigger and content loads
  const deferredTitles = [
    'pb-progression',
    'solve-time-distribution',
    'density-shift',
    'metrics-evolution',
    'solves-table',
  ];

  for (const name of deferredTitles) {
    const el = await page.$(`#deferred-${name}`);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page
        .waitForSelector(`#deferred-${name} > :not(.animate-pulse)`, { timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  // Temporarily disable content-visibility: auto during screenshot so Chromium paints off-screen charts for fullPage capture
  await page.addStyleTag({
    content: '.chart-content-visibility { content-visibility: visible !important; }',
  });

  // Scroll back to top so viewport screenshots capture the initial above-the-fold screen
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  // If with_install argument is given, dispatch beforeinstallprompt to test install button
  if (process.argv.includes('--install')) {
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, { prompt: () => Promise.resolve({ outcome: 'accepted' }) });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(300);
  }

  // If --modal is passed, open the instruction modal
  if (process.argv.includes('--modal')) {
    const guideBtn = await page.$('#navbar-guide');
    if (guideBtn) {
      await guideBtn.click();
      await page.waitForSelector('#instruction-modal [role="dialog"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    }
  }

  if (selector === 'viewport') {
    await page.screenshot({ path: outName, fullPage: false });
    console.log(`Saved viewport screenshot to ${outName}`);
  } else if (selector) {
    const element = await page.$(selector);
    if (element) {
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await element.screenshot({ path: outName });
      console.log(`Saved screenshot of ${selector} to ${outName}`);
    } else {
      console.error(`Selector ${selector} not found`);
    }
  } else {
    await page.screenshot({ path: outName, fullPage: true });
    console.log(`Saved full page screenshot to ${outName}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
