import {
  Database,
  Download,
  FileText,
  HelpCircle,
  RefreshCw,
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
  onReset: () => void;
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
  onReset,
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 safe-area-x w-full gap-2 sm:gap-4">
        {/* Brand Logo & Title */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 font-black text-stone-950 shadow-lg shadow-amber-500/10"
            title="CubeProgression"
            aria-hidden="true"
          >
            <Timer className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-[15px] sm:text-base md:text-lg leading-tight font-bold tracking-tight text-stone-100 whitespace-nowrap">
                <span>CubeProgression</span>
              </h1>
              <span className="hidden sm:inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                csTimer Analytics
              </span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-medium tracking-wide sm:hidden leading-none mt-0.5">
              csTimer Progression
            </p>
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
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-2.5">
          {!isOnline && (
            <div
              role="status"
              aria-label="Offline mode"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 lg:px-2.5 lg:py-1 text-xs font-medium text-amber-400 shrink-0"
              title="You are offline. All features, solves, and statistics operate locally."
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden lg:inline">Offline mode</span>
              <span className="sr-only lg:hidden">Offline mode</span>
            </div>
          )}

          {canInstall && (
            <button
              type="button"
              onClick={handleInstall}
              aria-label="Install App"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 lg:px-3 lg:py-1.5 text-xs font-medium whitespace-nowrap text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 active:scale-95 shrink-0"
              title="Install CubeProgression as a Progressive Web App"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden lg:inline">Install App</span>
            </button>
          )}

          {onOpenInstructions && (
            <button
              type="button"
              onClick={onOpenInstructions}
              aria-label="Export Guide"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800/90 px-2.5 py-1.5 sm:px-3 text-xs font-medium whitespace-nowrap text-stone-200 transition-all hover:border-amber-500/40 hover:bg-stone-700/80 active:scale-95 shadow-sm shrink-0"
              title="How to export solves from csTimer"
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="sm:hidden">Guide</span>
              <span className="hidden sm:inline">Export Guide</span>
            </button>
          )}

          {isSaved && onClearStorage ? (
            <button
              type="button"
              onClick={onClearStorage}
              aria-label="Reset Data"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800/90 p-2 md:px-3 md:py-1.5 text-xs font-medium whitespace-nowrap text-stone-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95 shadow-sm shrink-0"
              title="Reset Data"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-stone-400" />
              <span className="hidden md:inline">Reset</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset Data"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800/90 p-2 md:px-3 md:py-1.5 text-xs font-medium whitespace-nowrap text-stone-300 transition-all hover:border-stone-600 hover:bg-stone-700/80 hover:text-stone-100 active:scale-95 shadow-sm shrink-0"
              title="Reset Data"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0 text-stone-400" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
