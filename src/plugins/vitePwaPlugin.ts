import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export function vitePwaPlugin(): Plugin {
  return {
    name: 'vite-plugin-cubeprogression-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Collect all emitted assets and chunks
      const assetUrls = new Set<string>();

      // Always precache root and index.html
      assetUrls.add('./');
      assetUrls.add('index.html');

      // Public static assets
      const publicAssets = [
        'favicon.svg',
        'manifest.webmanifest',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'apple-touch-icon.png',
      ];

      for (const asset of publicAssets) {
        assetUrls.add(asset);
      }

      // Bundle chunks and assets (JS, CSS)
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith('.map') && !fileName.endsWith('sw.js')) {
          assetUrls.add(fileName);
        }
      }

      const sortedAssets = Array.from(assetUrls).sort();

      // Create a deterministic cache version hash incorporating file contents
      const hasher = createHash('sha256');
      for (const asset of sortedAssets) {
        hasher.update(asset);
        if (bundle[asset]) {
          const item = bundle[asset];
          if (item.type === 'asset') {
            hasher.update(typeof item.source === 'string' ? item.source : Buffer.from(item.source));
          } else if (item.type === 'chunk') {
            hasher.update(item.code);
          }
        } else {
          // Public static assets reside in public/ directory
          const publicFilePath = resolve(process.cwd(), 'public', asset);
          if (existsSync(publicFilePath) && statSync(publicFilePath).isFile()) {
            hasher.update(readFileSync(publicFilePath));
          }
        }
      }

      const hash = hasher.digest('hex').slice(0, 12);
      const cacheName = `cubeprogression-v-${hash}`;

      const swCode = `/**
 * CubeProgression Service Worker - Offline Cache & PWA Support
 * Cache Version: ${cacheName}
 */

const CACHE_NAME = '${cacheName}';
const PRECACHE_ASSETS = ${JSON.stringify(sortedAssets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urlsToPrecache = PRECACHE_ASSETS.map((asset) => new URL(asset, self.location.href).href);
      await Promise.allSettled(
        urlsToPrecache.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) {
              await cache.put(url, res);
            }
          } catch {
            // Ignore individual prefetch failures so install is resilient
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith('cubeprogression-v-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // Navigation requests: Network-First with cached fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Non-OK network navigation response');
        } catch {
          const indexFallback =
            (await caches.match(new URL('index.html', self.location.href).href)) ||
            (await caches.match(new URL('./', self.location.href).href)) ||
            (await caches.match(request));
          if (indexFallback) return indexFallback;
          throw new Error('Offline fallback unavailable');
        }
      })()
    );
    return;
  }

  // Static assets: Cache-First with network fallback
  event.respondWith(
    (async () => {
      const cached =
        (await caches.match(request)) ||
        (await caches.match(request.url)) ||
        (await caches.match(new URL(request.url).pathname));
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
`;

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: swCode,
      });
    },
  };
}
