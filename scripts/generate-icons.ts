import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

async function generateIcons() {
  const publicDir = path.resolve(import.meta.dirname, '../public');
  const svgContent = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf-8');

  // Create a maskable version where the dark background fills the entire 512x512 canvas (no rounded rx)
  // and scale the inner stopwatch slightly so it sits safely inside the 80% safe circle.
  const maskableSvg = svgContent
    .replace(
      '<rect width="512" height="512" rx="118" fill="url(#cp-bg)"/>',
      '<rect width="512" height="512" fill="url(#cp-bg)"/>',
    )
    .replace(
      '<rect width="506" height="506" x="3" y="3" rx="115" fill="none" stroke="#334155" stroke-width="2.5" opacity="0.6"/>',
      '',
    )
    .replace(
      'transform="translate(256, 268) scale(1.24)"',
      'transform="translate(256, 260) scale(1.06)"',
    );

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const iconSizes = [
    { name: 'pwa-192x192.webp', size: 192, svg: svgContent },
    { name: 'pwa-512x512.webp', size: 512, svg: svgContent },
    { name: 'apple-touch-icon.webp', size: 180, svg: svgContent },
    { name: 'pwa-maskable-512x512.webp', size: 512, svg: maskableSvg },
  ];

  for (const { name, size, svg } of iconSizes) {
    const html = `
      <!doctype html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
            svg { width: ${size}px; height: ${size}px; display: block; }
          </style>
        </head>
        <body>${svg}</body>
      </html>
    `;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    const tempPngPath = path.join(publicDir, `temp-${size}.png`);
    const finalWebpPath = path.join(publicDir, name);
    const buffer = await page.screenshot({ omitBackground: true });
    writeFileSync(tempPngPath, buffer);
    execSync(`cwebp -q 75 "${tempPngPath}" -o "${finalWebpPath}"`);
    unlinkSync(tempPngPath);
    console.log(`Generated public/${name} (${size}x${size}, webp q75)`);
  }

  await browser.close();
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
