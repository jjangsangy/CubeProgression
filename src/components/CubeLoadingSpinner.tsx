import React from 'react';
import { motion } from 'motion/react';

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
  const cubeColors = [
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

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer spinning ambient glow ring */}
      <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
      <div
        className="absolute -inset-2 rounded-2xl border-2 border-amber-500/30 animate-spin border-t-amber-400 border-r-amber-500/10"
        style={{ animationDuration: '1.8s' }}
      />

      {/* 3x3 Cube Grid Visual with animated face tile shifts */}
      <div
        className={`relative grid grid-cols-3 gap-1 bg-stone-950/90 border border-stone-700/80 rounded-xl shadow-2xl ${sizeClasses[size]}`}
      >
        {cubeColors.map((colorClass, i) => (
          <motion.div
            key={i}
            className={`${tileSizes[size]} rounded-sm ${colorClass} shadow-sm`}
            animate={{
              scale: [1, 1.25, 0.9, 1],
              opacity: [0.75, 1, 0.75],
              rotate: [0, i % 2 === 0 ? 90 : -90, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: (i * 0.12) % 0.8,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
};
