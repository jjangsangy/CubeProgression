import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CubeLoadingSpinner } from './CubeLoadingSpinner';

// Anchor on the stable status region id; fails loudly if the region is missing.
const getSpinner = (container: HTMLElement): HTMLElement => {
  const spinner = container.querySelector('#cube-loading-spinner');
  expect(spinner).not.toBeNull();
  return spinner as HTMLElement;
};

// The 9 face tiles are the direct children of the 3x3 grid container, in cubeTiles order.
const getTiles = (container: HTMLElement): Element[] => {
  const grid = container.querySelector('#cube-spinner-grid');
  expect(grid).not.toBeNull();
  return Array.from((grid as HTMLElement).children);
};

describe('CubeLoadingSpinner', () => {
  it('renders with accessibility role status and label', () => {
    const { container } = render(<CubeLoadingSpinner />);

    const statusEl = getSpinner(container);
    expect(statusEl).toHaveAttribute('role', 'status');
    expect(statusEl).toHaveAttribute('aria-label', 'Loading...');
    expect(statusEl.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it('renders all 9 speedcube face tiles with authentic sticker colors', () => {
    const { container } = render(<CubeLoadingSpinner />);

    const expectedColors = [
      'bg-amber-400',
      'bg-emerald-400',
      'bg-sky-400',
      'bg-orange-500',
      'bg-rose-500',
      'bg-amber-300',
      'bg-emerald-500',
      'bg-sky-500',
      'bg-orange-400',
    ];

    const tiles = getTiles(container);
    expect(tiles).toHaveLength(expectedColors.length);

    tiles.forEach((tile, index) => {
      expect(tile).toHaveClass(expectedColors[index]);
      expect(tile).toHaveClass('rounded-sm');
      expect(tile).toHaveClass('shadow-sm');
    });
  });

  it('applies correct size classes for sm, md, and lg sizes', () => {
    // Default size is 'md'
    const { container, rerender } = render(<CubeLoadingSpinner />);
    const grid = container.querySelector('#cube-spinner-grid');
    expect(grid).toHaveClass('w-16');
    expect(grid).toHaveClass('h-16');
    expect(getTiles(container)[0]).toHaveClass('w-3', 'h-3');

    // Small size 'sm'
    rerender(<CubeLoadingSpinner size="sm" />);
    expect(grid).toHaveClass('w-10');
    expect(grid).toHaveClass('h-10');
    expect(getTiles(container)[0]).toHaveClass('w-2', 'h-2');

    // Large size 'lg'
    rerender(<CubeLoadingSpinner size="lg" />);
    expect(grid).toHaveClass('w-20');
    expect(grid).toHaveClass('h-20');
    expect(getTiles(container)[0]).toHaveClass('w-4', 'h-4');
  });

  it('assigns clockwise and counter-clockwise GPU animation classes based on tile rotation direction', () => {
    const { container } = render(<CubeLoadingSpinner />);

    const tiles = getTiles(container);
    expect(tiles).toHaveLength(9);

    // CW tiles by index: 0, 2, 4, 6, 8 (rotateDir > 0)
    for (const index of [0, 2, 4, 6, 8]) {
      expect(tiles[index]).toHaveClass('animate-cube-cw');
      expect(tiles[index]).not.toHaveClass('animate-cube-ccw');
    }

    // CCW tiles by index: 1, 3, 5, 7 (rotateDir < 0)
    for (const index of [1, 3, 5, 7]) {
      expect(tiles[index]).toHaveClass('animate-cube-ccw');
      expect(tiles[index]).not.toHaveClass('animate-cube-cw');
    }
  });

  it('applies staggered animation delays as inline styles', () => {
    const { container } = render(<CubeLoadingSpinner />);

    const expectedDelays = [
      '0s',
      '0.12s',
      '0.24s',
      '0.36s',
      '0.48s',
      '0.6s',
      '0.72s',
      '0.04s',
      '0.16s',
    ];

    const tiles = getTiles(container);
    expect(tiles).toHaveLength(expectedDelays.length);
    tiles.forEach((tile, index) => {
      expect(tile).toHaveStyle({ animationDelay: expectedDelays[index] });
    });
  });

  it('renders ambient glow and spinning outer ring', () => {
    const { container } = render(<CubeLoadingSpinner />);

    const statusEl = getSpinner(container);
    // Direct children: glow (0), spin ring (1), 3x3 grid (2), and the sr-only status text (3)
    expect(statusEl.children.length).toBe(4);

    const glow = statusEl.children[0] as HTMLElement;
    expect(glow).toHaveClass('animate-pulse');

    const spinRing = statusEl.children[1] as HTMLElement;
    expect(spinRing).toHaveClass('animate-spin');
    expect(spinRing).toHaveStyle({ animationDuration: '1.8s' });
  });
});
