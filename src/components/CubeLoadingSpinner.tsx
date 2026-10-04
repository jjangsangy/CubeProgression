import type React from 'react';

interface CubeLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const CubeLoadingSpinner: React.FC<CubeLoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 p-1',
    md: 'w-16 h-16 p-1.5',
    lg: 'w-20 h-20 p-2',
  };

  const tileSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Authentic speedcube sticker colors (White, Yellow, Green, Blue, Red, Orange)
  const cubeTiles = [
    { id: 'cube-tile-0', colorClass: 'bg-amber-400', rotateDir: 90, delay: 0 },
    { id: 'cube-tile-1', colorClass: 'bg-emerald-400', rotateDir: -90, delay: 0.12 },
    { id: 'cube-tile-2', colorClass: 'bg-sky-400', rotateDir: 90, delay: 0.24 },
    { id: 'cube-tile-3', colorClass: 'bg-orange-500', rotateDir: -90, delay: 0.36 },
    { id: 'cube-tile-4', colorClass: 'bg-rose-500', rotateDir: 90, delay: 0.48 },
    { id: 'cube-tile-5', colorClass: 'bg-amber-300', rotateDir: -90, delay: 0.6 },
    { id: 'cube-tile-6', colorClass: 'bg-emerald-500', rotateDir: 90, delay: 0.72 },
    { id: 'cube-tile-7', colorClass: 'bg-sky-500', rotateDir: -90, delay: 0.04 },
    { id: 'cube-tile-8', colorClass: 'bg-orange-400', rotateDir: 90, delay: 0.16 },
  ];

  return (
    <div
      id="cube-loading-spinner"
      role="status"
      aria-label="Loading..."
      className="relative flex items-center justify-center"
    >
      {/* Outer spinning ambient glow ring */}
      <div className="absolute inset-0 animate-pulse rounded-2xl bg-amber-500/20 blur-xl" />
      <div
        className="absolute -inset-2 animate-spin rounded-2xl border-2 border-amber-500/30 border-t-amber-400 border-r-amber-500/10"
        style={{ animationDuration: '1.8s' }}
      />

      {/* 3x3 Cube Grid Visual with animated face tile shifts */}
      <div
        id="cube-spinner-grid"
        className={`relative grid grid-cols-3 gap-1 bg-stone-950/90 border border-stone-700/80 rounded-xl shadow-2xl ${sizeClasses[size]}`}
      >
        {cubeTiles.map((tile) => (
          <div
            key={tile.id}
            className={`${tileSizes[size]} rounded-sm ${tile.colorClass} shadow-sm ${
              tile.rotateDir > 0 ? 'animate-cube-cw' : 'animate-cube-ccw'
            }`}
            style={{ animationDelay: `${tile.delay}s` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading solve data...</span>
    </div>
  );
};
