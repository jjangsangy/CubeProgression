/// <reference types="vitest" />

import path from 'node:path';
import { codecovVitePlugin } from '@codecov/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { vitePwaPlugin } from './src/plugins/vitePwaPlugin.ts';

/**
 * Inlines the compiled CSS bundle directly into index.html <style> tags.
 * Eliminates render-blocking CSS network round-trips.
 */
function inlineCriticalCss(): Plugin {
  return {
    name: 'vite-plugin-inline-critical-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        let transformedHtml = html;
        for (const [fileName, asset] of Object.entries(ctx.bundle)) {
          if (fileName.endsWith('.css') && 'source' in asset) {
            const cssContent =
              typeof asset.source === 'string'
                ? asset.source
                : new TextDecoder().decode(asset.source);
            const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const linkRegex = new RegExp(
              `<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*?${escaped}["'][^>]*>|<link[^>]*href=["'][^"']*?${escaped}["'][^>]*rel=["']stylesheet["'][^>]*>`,
              'gi',
            );
            transformedHtml = transformedHtml.replace(linkRegex, `<style>${cssContent}</style>`);
            // Retain the CSS asset in the bundle output rather than deleting it.
            // If any dynamic chunk or browser module preload references the CSS asset URL,
            // the file remains available (avoiding 404s and preload link error events).
          }
        }
        return transformedHtml;
      },
    },
  };
}

export default defineConfig(() => {
  return {
    base: process.env.BASE_PATH || './',
    plugins: [
      react({
        compiler: {
          target: '19',
        },
      }),
      tailwindcss(),
      inlineCriticalCss(),
      vitePwaPlugin(),
      codecovVitePlugin({
        enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined || process.env.CI === 'true',
        bundleName: 'CubeProgression',
        uploadToken: process.env.CODECOV_TOKEN,
        gitService: 'github',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: false,
      cssMinify: 'lightningcss',
      chunkSizeWarningLimit: 600,
      modulePreload: {
        polyfill: false,
        resolveDependencies(_filename, deps) {
          return deps.filter(
            (dep) => !dep.includes('temporal-vendor') && !dep.includes('recharts-vendor'),
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('recharts') ||
                id.includes('@reduxjs/toolkit') ||
                id.includes('react-redux') ||
                id.includes('victory-vendor') ||
                id.includes('reselect') ||
                id.includes('immer') ||
                id.includes('decimal.js-light')
              ) {
                return 'recharts-vendor';
              }
              if (id.includes('temporal-polyfill')) {
                return 'temporal-vendor';
              }
              if (
                id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/scheduler/')
              ) {
                return 'react-vendor';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/setupTests.tsx'],
      testTimeout: 15000,
      reporters: process.env.CI ? ['default', 'junit'] : ['default'],
      outputFile: {
        junit: 'junit.xml',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: ['node_modules/', 'src/setupTests.tsx', 'src/types.ts', 'src/index.css'],
      },
    },
  };
});
