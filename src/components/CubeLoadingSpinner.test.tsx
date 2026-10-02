import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CubeLoadingSpinner } from './CubeLoadingSpinner';

describe('CubeLoadingSpinner', () => {
  it('renders with accessibility role status and label', () => {
    render(<CubeLoadingSpinner />);

    const statusEl = screen.getByRole('status', { name: /loading/i });
    expect(statusEl).toBeInTheDocument();
    expect(screen.getByText('Loading solve data...')).toBeInTheDocument();
  });

  it('renders all 9 speedcube face tiles with authentic sticker colors', () => {
    render(<CubeLoadingSpinner />);

    const expectedTiles = [
      { id: 'cube-tile-0', colorClass: 'bg-amber-400' },
      { id: 'cube-tile-1', colorClass: 'bg-emerald-400' },
      { id: 'cube-tile-2', colorClass: 'bg-sky-400' },
      { id: 'cube-tile-3', colorClass: 'bg-orange-500' },
      { id: 'cube-tile-4', colorClass: 'bg-rose-500' },
      { id: 'cube-tile-5', colorClass: 'bg-amber-300' },
      { id: 'cube-tile-6', colorClass: 'bg-emerald-500' },
      { id: 'cube-tile-7', colorClass: 'bg-sky-500' },
      { id: 'cube-tile-8', colorClass: 'bg-orange-400' },
    ];

    for (const { id, colorClass } of expectedTiles) {
      const tile = screen.getByTestId(id);
      expect(tile).toBeInTheDocument();
      expect(tile).toHaveClass(colorClass);
      expect(tile).toHaveClass('rounded-sm');
      expect(tile).toHaveClass('shadow-sm');
    }
  });

  it('applies correct size classes for sm, md, and lg sizes', () => {
    // Default size is 'md'
    const { rerender } = render(<CubeLoadingSpinner />);
    const grid = screen.getByTestId('cube-spinner-grid');
    expect(grid).toHaveClass('w-16');
    expect(grid).toHaveClass('h-16');
    expect(screen.getByTestId('cube-tile-0')).toHaveClass('w-3', 'h-3');

    // Small size 'sm'
    rerender(<CubeLoadingSpinner size="sm" />);
    expect(grid).toHaveClass('w-10');
    expect(grid).toHaveClass('h-10');
    expect(screen.getByTestId('cube-tile-0')).toHaveClass('w-2', 'h-2');

    // Large size 'lg'
    rerender(<CubeLoadingSpinner size="lg" />);
    expect(grid).toHaveClass('w-20');
    expect(grid).toHaveClass('h-20');
    expect(screen.getByTestId('cube-tile-0')).toHaveClass('w-4', 'h-4');
  });

  it('assigns clockwise and counter-clockwise GPU animation classes based on tile rotation direction', () => {
    render(<CubeLoadingSpinner />);

    // CW tiles: 0, 2, 4, 6, 8 (rotateDir > 0)
    const cwTileIds = ['cube-tile-0', 'cube-tile-2', 'cube-tile-4', 'cube-tile-6', 'cube-tile-8'];
    for (const id of cwTileIds) {
      const tile = screen.getByTestId(id);
      expect(tile).toHaveClass('animate-cube-cw');
      expect(tile).not.toHaveClass('animate-cube-ccw');
    }

    // CCW tiles: 1, 3, 5, 7 (rotateDir < 0)
    const ccwTileIds = ['cube-tile-1', 'cube-tile-3', 'cube-tile-5', 'cube-tile-7'];
    for (const id of ccwTileIds) {
      const tile = screen.getByTestId(id);
      expect(tile).toHaveClass('animate-cube-ccw');
      expect(tile).not.toHaveClass('animate-cube-cw');
    }
  });

  it('applies staggered animation delays as inline styles', () => {
    render(<CubeLoadingSpinner />);

    const expectedDelays: Record<string, string> = {
      'cube-tile-0': '0s',
      'cube-tile-1': '0.12s',
      'cube-tile-2': '0.24s',
      'cube-tile-3': '0.36s',
      'cube-tile-4': '0.48s',
      'cube-tile-5': '0.6s',
      'cube-tile-6': '0.72s',
      'cube-tile-7': '0.04s',
      'cube-tile-8': '0.16s',
    };

    for (const [id, delay] of Object.entries(expectedDelays)) {
      const tile = screen.getByTestId(id);
      expect(tile).toHaveStyle({ animationDelay: delay });
    }
  });

  it('renders ambient glow and spinning outer ring', () => {
    render(<CubeLoadingSpinner />);

    const glow = screen.getByTestId('cube-glow-ambient');
    expect(glow).toBeInTheDocument();
    expect(glow).toHaveClass('animate-pulse');

    const spinRing = screen.getByTestId('cube-spin-ring');
    expect(spinRing).toBeInTheDocument();
    expect(spinRing).toHaveClass('animate-spin');
    expect(spinRing).toHaveStyle({ animationDuration: '1.8s' });
  });
});
