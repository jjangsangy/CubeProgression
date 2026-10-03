import {
  Database,
  Download,
  FileText,
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
    <header className="relative border-b border-stone-800 bg-stone-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 safe-area-x">
        {/* Brand Logo & Title */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 font-black text-stone-950 shadow-lg shadow-amber-500/10">
            <Timer className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="truncate text-[15px] sm:text-lg leading-tight font-bold tracking-tight text-stone-100">
                CubeProgression
              </h1>
              <span className="hidden rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase sm:inline-block">
                csTimer Analytics
              </span>
            </div>
            <p className="hidden text-xs text-stone-400 sm:block">
              Speedcubing solve time progression & statistical shift analyzer
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isOnline && (
            <div
              role="status"
              aria-label="Offline mode"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 sm:px-2.5 py-1 text-xs font-medium text-amber-400"
              title="You are offline. All features, solves, and statistics operate locally."
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden sm:inline">Offline mode</span>
              <span className="sr-only sm:hidden">Offline mode</span>
            </div>
          )}

          {canInstall && (
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 sm:px-3 py-1.5 text-xs font-medium whitespace-nowrap text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 active:scale-95"
              title="Install CubeProgression as a Progressive Web App"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {isSaved && (
            <div
              className="hidden items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 lg:flex"
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
            <div className="hidden items-center gap-1.5 rounded-lg border border-stone-700/60 bg-stone-800/80 px-3 py-1 font-mono text-xs text-stone-300 md:flex">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span className="max-w-[140px] truncate">{fileName}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onLoadDemo}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-stone-950 shadow-md shadow-amber-500/10 transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 fill-current" />
            <span className="hidden sm:inline">Load Sample Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            aria-label="Export CSV"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 p-2 sm:px-3 sm:py-1.5 text-xs font-medium whitespace-nowrap text-stone-200 transition-all hover:bg-stone-700/80 active:scale-95"
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
              className="cursor-pointer rounded-xl p-2 text-stone-400 transition-all hover:bg-rose-500/10 hover:text-rose-400"
              title="Reset Data"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset Data"
              className="cursor-pointer rounded-xl p-2 text-stone-400 transition-all hover:bg-stone-800 hover:text-stone-200"
              title="Reset Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
