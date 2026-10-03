import {
  Database,
  Download,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Timer,
  Trash2,
  WifiOff,
} from 'lucide-react';
import type React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useStorageStatus } from '../hooks/useStorageNotice';

interface NavbarProps {
  fileName?: string;
  onLoadDemo: () => void;
  onReset: () => void;
  onExportCSV: () => void;
  isSaved?: boolean;
  storageUsageMB?: number;
  onClearStorage?: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  isOnline?: boolean;
  onOpenInstructions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fileName,
  onLoadDemo,
  onReset,
  onExportCSV,
  isSaved: propIsSaved,
  storageUsageMB: propStorageUsageMB,
  onClearStorage,
  canInstall: propCanInstall,
  onInstall,
  isOnline: propIsOnline,
  onOpenInstructions,
}) => {
  const storageStatus = useStorageStatus();
  const hookOnlineStatus = useOnlineStatus();
  const pwaInstall = usePwaInstall();

  const isSaved = propIsSaved ?? storageStatus.isSaved;
  const storageUsageMB = propStorageUsageMB ?? storageStatus.storageUsageMB;
  const isOnline = propIsOnline ?? hookOnlineStatus;
  const canInstall = propCanInstall ?? pwaInstall.canInstall;
  const handleInstall = onInstall ?? pwaInstall.promptInstall;
  return (
    <header className="relative border-b border-stone-800 bg-stone-950 w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 safe-area-x w-full gap-2 sm:gap-4">
        {/* Brand Logo & Title (Icon only in mobile portrait; title visible sm:) */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 font-black text-stone-950 shadow-lg shadow-amber-500/10"
            title="CubeProgression"
            aria-hidden="true"
          >
            <Timer className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg leading-tight font-bold tracking-tight text-stone-100 whitespace-nowrap">
                <span className="sr-only sm:not-sr-only">CubeProgression</span>
              </h1>
              <span className="hidden xl:inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                csTimer Analytics
              </span>
            </div>
            <p className="text-xs text-stone-400 truncate max-w-xs xl:max-w-md hidden xl:block">
              Speedcubing solve time progression &amp; statistical shift analyzer
            </p>
          </div>
        </div>

        {/* Center Status Indicators (Saved badge & Active filename pill) */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-2 sm:gap-3 min-w-0 px-2">
          {isSaved && (
            <div
              className="hidden items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 lg:flex shrink-0"
              title="Data is persisted across reloads in browser IndexedDB storage"
            >
              <Database className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>Saved locally</span>
              {storageUsageMB !== undefined && storageUsageMB > 0 && (
                <span className="font-mono text-[11px] text-emerald-500/80">
                  ({storageUsageMB} MB)
                </span>
              )}
            </div>
          )}

          {fileName && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-stone-700/60 bg-stone-800/80 px-2.5 py-1 font-mono text-xs text-stone-300 md:flex shrink min-w-0">
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="max-w-[100px] sm:max-w-[130px] lg:max-w-[180px] xl:max-w-[260px] truncate">
                {fileName}
              </span>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-1 sm:flex-initial items-center justify-between sm:justify-end gap-1.5 sm:gap-2 md:gap-2.5 min-w-0">
          {!isOnline && (
            <div
              role="status"
              aria-label="Offline mode"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 sm:px-2.5 sm:py-1 text-xs font-medium text-amber-400 shrink-0"
              title="You are offline. All features, solves, and statistics operate locally."
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden xl:inline">Offline mode</span>
              <span className="sr-only xl:hidden">Offline mode</span>
            </div>
          )}

          {canInstall && (
            <button
              type="button"
              onClick={handleInstall}
              aria-label="Install App"
              className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 lg:px-3 lg:py-1.5 text-xs font-medium whitespace-nowrap text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 active:scale-95"
              title="Install CubeProgression as a Progressive Web App"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden lg:inline">Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLoadDemo}
            className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-2 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-stone-950 shadow-md shadow-amber-500/10 transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95"
            title="Load Sample Data"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 fill-current" />
            <span className="hidden sm:inline">Load Sample Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {onOpenInstructions && (
            <button
              type="button"
              onClick={onOpenInstructions}
              aria-label="Export Guide"
              className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 p-2 sm:px-2.5 sm:py-1.5 xl:px-3 text-xs font-medium whitespace-nowrap text-stone-200 transition-all hover:bg-stone-700/80 active:scale-95"
              title="How to export solves from csTimer"
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden xl:inline">Export Guide</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            aria-label="Export CSV"
            className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 p-2 sm:px-3 sm:py-1.5 text-xs font-medium whitespace-nowrap text-stone-200 transition-all hover:bg-stone-700/80 active:scale-95"
            title="Export Period Summary Stats as CSV"
          >
            <Download className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {isSaved && onClearStorage ? (
            <button
              type="button"
              onClick={onClearStorage}
              aria-label="Reset Data"
              className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-700/60 bg-stone-800 p-2 text-stone-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
              title="Reset Data"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset Data"
              className="flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-700/60 bg-stone-800 p-2 text-stone-400 transition-all hover:bg-stone-700/80 hover:text-stone-200 active:scale-95"
              title="Reset Data"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
