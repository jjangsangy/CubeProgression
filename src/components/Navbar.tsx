import { Database, Download, FileText, RefreshCw, Sparkles, Timer, Trash2 } from 'lucide-react';
import type React from 'react';

interface NavbarProps {
  fileName?: string;
  onLoadDemo: () => void;
  onReset: () => void;
  onExportCSV: () => void;
  isSaved?: boolean;
  storageUsageMB?: number;
  onClearStorage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fileName,
  onLoadDemo,
  onReset,
  onExportCSV,
  isSaved,
  storageUsageMB,
  onClearStorage,
}) => {
  return (
    <header className="relative border-b border-stone-800 bg-stone-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 font-black text-stone-950 shadow-lg shadow-amber-500/10">
            <Timer className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base leading-tight font-bold tracking-tight text-stone-100 sm:text-lg">
                CubeProgression
              </h1>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-stone-950 shadow-md shadow-amber-500/10 transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Load Sample Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-200 transition-all hover:bg-stone-700/80 active:scale-95"
            title="Export Period Summary Stats as CSV"
          >
            <Download className="h-3.5 w-3.5 text-stone-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {isSaved && onClearStorage ? (
            <button
              type="button"
              onClick={onClearStorage}
              className="cursor-pointer rounded-xl p-1.5 text-stone-400 transition-all hover:bg-rose-500/10 hover:text-rose-400"
              title="Reset Data"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer rounded-xl p-1.5 text-stone-400 transition-all hover:bg-stone-800 hover:text-stone-200"
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
