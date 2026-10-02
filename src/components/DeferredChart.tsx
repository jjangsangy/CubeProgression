import type React from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';

export interface DeferredChartProps {
  children: React.ReactNode;
  minHeight: number | string;
  rootMargin?: string;
  fallbackTitle?: string;
  className?: string;
}

export const DeferredChart: React.FC<DeferredChartProps> = ({
  children,
  minHeight,
  rootMargin = '250px',
  fallbackTitle,
  className = '',
}) => {
  // In environments without IntersectionObserver (e.g. JSDOM), render immediately
  const hasIntersectionObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;
  const [isVisible, setIsVisible] = useState(!hasIntersectionObserver);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible || !hasIntersectionObserver) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, hasIntersectionObserver, rootMargin]);

  const styleMinHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  const skeleton = (
    <div
      style={{ minHeight: styleMinHeight }}
      className="flex w-full flex-col justify-between rounded-2xl border border-stone-800/80 bg-stone-900/60 p-6 animate-pulse"
      data-testid="deferred-chart-skeleton"
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 rounded-md bg-stone-800" />
        <div className="h-8 w-24 rounded-lg bg-stone-800" />
      </div>
      <div className="my-auto flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-stone-800" />
        {fallbackTitle && (
          <span className="text-xs text-stone-500 font-medium">Loading {fallbackTitle}...</span>
        )}
      </div>
      <div className="h-4 w-32 rounded bg-stone-800/60" />
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{ minHeight: styleMinHeight }}
      className={`w-full transition-opacity duration-300 chart-content-visibility ${className}`}
    >
      {isVisible ? <Suspense fallback={skeleton}>{children}</Suspense> : skeleton}
    </div>
  );
};
