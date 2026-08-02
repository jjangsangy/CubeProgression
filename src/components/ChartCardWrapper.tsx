import React, { useRef, useState, useEffect } from 'react';
import { Maximize2, Minimize2, Download, Loader2 } from 'lucide-react';
import { toPng, toCanvas } from 'html-to-image';

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
          const liveRecharts = el.querySelectorAll('.recharts-wrapper, .recharts-responsive-container');
          const clonedRecharts = clonedNode.querySelectorAll('.recharts-wrapper, .recharts-responsive-container');
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
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-800/80 pb-4 w-full min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {headerBadge}
            <h2 className="text-lg font-bold text-stone-100 tracking-tight leading-tight">
              {title}
            </h2>
          </div>
          {subtitle && <p className="text-xs text-stone-400 mt-1 leading-relaxed">{subtitle}</p>}
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto max-w-full min-w-0">
          {headerControls}

          <div className="flex items-center gap-1 border-l border-stone-800 pl-2 shrink-0 export-exclude">
            {/* Download Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              title="Download Plot as PNG Image"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700/80 text-stone-300 hover:text-stone-100 border border-stone-700/60 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span className="hidden md:inline">PNG</span>
            </button>

            {/* Maximize / Minimize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore View (Esc)' : 'Maximize to Fullscreen'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700/80 text-stone-300 hover:text-stone-100 border border-stone-700/60 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            >
              {isMaximized ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
                  <span className="hidden md:inline">Maximize</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Chart Container */}
      <div className={`flex-1 w-full ${isMaximized ? 'min-h-[550px]' : ''}`}>{children}</div>
    </div>
  );

  if (isMaximized) {
    return (
      <>
        {/* Placeholder element to maintain document flow */}
        <div className="hidden" />

        {/* Fullscreen Backdrop Overlay */}
        <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-xl z-[100] p-4 sm:p-8 flex flex-col justify-center items-center overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-7xl h-full max-h-[92vh] flex flex-col">
            {cardContent}
          </div>
        </div>
      </>
    );
  }

  return cardContent;
};
