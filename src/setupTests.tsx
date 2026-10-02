import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import type React from 'react';
import { Temporal } from 'temporal-polyfill';
import { afterEach, vi } from 'vitest';
import { storageNoticeStore } from './hooks/useStorageNotice';

afterEach(() => {
  storageNoticeStore.reset();
});

// Configure async util timeout for testing-library (jsdom + v8 coverage can be slow in CI)
configure({ asyncUtilTimeout: 10000 });

// Guarantee Temporal is available in test runners (Node.js CI, JSDOM)
if (typeof globalThis.Temporal === 'undefined') {
  (globalThis as unknown as { Temporal: typeof Temporal }).Temporal = Temporal;
}
if (
  typeof window !== 'undefined' &&
  typeof (window as unknown as { Temporal?: unknown }).Temporal === 'undefined'
) {
  (window as unknown as { Temporal?: unknown }).Temporal = Temporal;
}

// Polyfill ResizeObserver for Recharts and responsive components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill HTMLCanvasElement getContext for html-to-image / charts
if (typeof window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: [] })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  });

  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob');
  window.URL.revokeObjectURL = vi.fn();

  // Polyfill matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock HTMLAnchorElement.prototype.click to prevent jsdom navigation error
  HTMLAnchorElement.prototype.click = vi.fn();
}

// Mock Recharts ResponsiveContainer to avoid 0-width/0-height rendering issues in JSDOM
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});
