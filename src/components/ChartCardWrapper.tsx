import { Download, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChartCardWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerBadge?: React.ReactNode;
  headerControls?: React.ReactNode;
  filenamePrefix?: string;
}

const triggerBlobDownload = (dataUrl: string, filename: string) => {
  try {
    // If it's a base64 data URL, convert to Blob for reliable downloading in cross-origin / iframe environments
    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = filename;
      link.href = blobUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error triggering download:', err);
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const ChartCardWrapper: React.FC<ChartCardWrapperProps> = ({
  title,
  subtitle,
  children,
  headerBadge,
  headerControls,
  filenamePrefix = 'speedcubing_plot',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // Lock body scroll when maximized
  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

  const handleDownloadImage = async () => {
    if (!cardRef.current || isDownloading) return;

    try {
      setIsDownloading(true);
      const el = cardRef.current;

      const { toCanvas, toPng } = await import('html-to-image');

      // Small pause to allow layout & rendering to settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Calculate true unclipped width & height
      const rect = el.getBoundingClientRect();
      let fullWidth = Math.max(el.scrollWidth, el.offsetWidth, rect.width);
      let fullHeight = Math.max(el.scrollHeight, el.offsetHeight, rect.height);

      // Check inner scrollable elements to ensure nothing is clipped
      const allChildren = el.querySelectorAll('*');
      allChildren.forEach((child) => {
        if (child instanceof HTMLElement) {
          if (child.scrollWidth > child.clientWidth) {
            fullWidth = Math.max(fullWidth, child.scrollWidth + 32);
          }
          if (child.scrollHeight > child.clientHeight) {
            fullHeight = Math.max(fullHeight, child.scrollHeight + 32);
          }
        }
      });

      fullWidth = Math.ceil(fullWidth);
      fullHeight = Math.ceil(fullHeight);

      const baseOptions = {
        cacheBust: false,
        skipFonts: true, // Crucial: prevents html-to-image from making cross-origin font requests that fail CORS
        backgroundColor: '#0c0a09', // stone-950
        pixelRatio: 2,
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          overflow: 'visible',
          position: 'static',
          transform: 'none',
        },
        filter: (node: Node) => {
          if (node instanceof HTMLElement && node.classList.contains('export-exclude')) {
            return false;
          }
          return true;
        },
        onClone: (clonedNode: HTMLElement) => {
          // Unconstrain root card element
          clonedNode.style.width = `${fullWidth}px`;
          clonedNode.style.height = `${fullHeight}px`;
          clonedNode.style.maxWidth = 'none';
          clonedNode.style.maxHeight = 'none';
          clonedNode.style.overflow = 'visible';
          clonedNode.style.borderRadius = '16px';

          // Unconstrain scrollable children in clone
          const clonedChildren = clonedNode.querySelectorAll('*');
          clonedChildren.forEach((child) => {
            if (child instanceof HTMLElement) {
              child.style.overflow = 'visible';
              child.style.maxHeight = 'none';
              child.style.maxWidth = 'none';
            }
          });

          // Preserve exact rendered pixel dimensions for Recharts wrappers
          const liveRecharts = el.querySelectorAll(
            '.recharts-wrapper, .recharts-responsive-container',
          );
          const clonedRecharts = clonedNode.querySelectorAll(
            '.recharts-wrapper, .recharts-responsive-container',
          );
          liveRecharts.forEach((liveItem, idx) => {
            const clonedItem = clonedRecharts[idx];
            if (liveItem instanceof HTMLElement && clonedItem instanceof HTMLElement) {
              const r = liveItem.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                clonedItem.style.width = `${r.width}px`;
                clonedItem.style.height = `${r.height}px`;
                clonedItem.style.minWidth = `${r.width}px`;
                clonedItem.style.minHeight = `${r.height}px`;
              }
            }
          });

          // Preserve exact dimensions on SVGs
          const liveSvgs = el.querySelectorAll('svg');
          const clonedSvgs = clonedNode.querySelectorAll('svg');
          liveSvgs.forEach((liveSvg, idx) => {
            const clonedSvg = clonedSvgs[idx];
            if (liveSvg instanceof SVGElement && clonedSvg instanceof SVGElement) {
              const r = liveSvg.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                clonedSvg.setAttribute('width', `${r.width}`);
                clonedSvg.setAttribute('height', `${r.height}`);
                clonedSvg.style.width = `${r.width}px`;
                clonedSvg.style.height = `${r.height}px`;
              }
            }
          });
        },
      };

      let dataUrl: string | null = null;

      // Attempt 1: High DPI toPng with skipFonts & cacheBust: false
      try {
        dataUrl = await toPng(el, baseOptions);
      } catch (err1) {
        console.warn('Primary toPng failed, retrying with pixelRatio 1:', err1);
        // Attempt 2: Standard resolution toPng
        try {
          dataUrl = await toPng(el, { ...baseOptions, pixelRatio: 1 });
        } catch (err2) {
          console.warn('Secondary toPng failed, retrying with toCanvas:', err2);
          // Attempt 3: toCanvas
          try {
            const canvas = await toCanvas(el, { ...baseOptions, pixelRatio: 1 });
            dataUrl = canvas.toDataURL('image/png');
          } catch (err3) {
            console.error('All PNG generation attempts failed:', err3);
          }
        }
      }

      if (dataUrl) {
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const filename = `${filenamePrefix}_${cleanTitle}.png`;
        triggerBlobDownload(dataUrl, filename);
      } else {
        alert('Could not export PNG image. Please check browser permissions.');
      }
    } catch (err) {
      console.error('Failed to export chart image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const cardContent = (
    <div
      ref={cardRef}
      className={`bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-6 shadow-xl text-stone-100 flex flex-col gap-4 relative overflow-hidden w-full max-w-full box-border ${
        isMaximized ? 'w-full h-full max-w-7xl mx-auto overflow-y-auto' : ''
      }`}
    >
      {/* Header Container */}
      <div className="flex w-full min-w-0 flex-col gap-3 border-b border-stone-800/80 pb-4">
        {/* Top Header Content: Action Buttons Floated Right so Title & Subtitle Reflow Around Them */}
        <div className="w-full min-w-0">
          {/* Export / Fullscreen Action Buttons */}
          <div className="export-exclude float-right ml-4 mb-1 flex shrink-0 items-center gap-1.5 pt-0.5">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              title="Download Plot as PNG Image"
              aria-label="Download Plot as PNG Image"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-300 shadow-sm transition-all hover:bg-stone-700/80 hover:text-stone-100 active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="h-3.5 w-3.5 text-stone-400" />
              )}
              <span className="hidden sm:inline">PNG</span>
            </button>

            {/* Maximize / Minimize Button */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore View (Esc)' : 'Maximize to Fullscreen'}
              aria-label={isMaximized ? 'Restore View (Esc)' : 'Maximize to Fullscreen'}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 px-2.5 py-1.5 text-xs font-medium text-stone-300 shadow-sm transition-all hover:bg-stone-700/80 hover:text-stone-100 active:scale-95"
            >
              {isMaximized ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-stone-400" />
                  <span className="hidden sm:inline">Maximize</span>
                </>
              )}
            </button>
          </div>

          {/* Title & Badge */}
          <h2 className="text-base leading-snug font-bold tracking-tight text-stone-100 sm:text-lg">
            {headerBadge && (
              <span className="mr-2 inline-flex items-center align-middle">{headerBadge}</span>
            )}
            <span className="align-middle">{title}</span>
          </h2>

          {/* Subtitle */}
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-stone-400">{subtitle}</p>}

          <div className="clear-both" />
        </div>

        {/* Secondary Toolbar Row (Controls) */}
        {headerControls && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 border-t border-stone-800/50 pt-1.5">
            {headerControls}
          </div>
        )}
      </div>

      {/* Main Body Chart Container */}
      <div
        className={`flex-1 w-full ${isMaximized ? 'min-h-[300px] sm:min-h-[450px] md:min-h-[550px]' : ''}`}
      >
        {children}
      </div>
    </div>
  );

  if (isMaximized) {
    const minHeight = cardRef.current?.offsetHeight || 400;
    return (
      <>
        {/* Placeholder element to preserve layout and prevent grid collapse */}
        <div style={{ minHeight }} aria-hidden="true" />

        {/* Fullscreen Backdrop Overlay via Portal */}
        {createPortal(
          <div className="fade-in fixed inset-0 z-[100] flex animate-in flex-col items-center justify-center overflow-y-auto bg-stone-950/95 p-4 backdrop-blur-xl duration-200 sm:p-8 safe-area-modal">
            <div className="flex h-full max-h-[92vh] w-full max-w-7xl flex-col">{cardContent}</div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return cardContent;
};
