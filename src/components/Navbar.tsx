import React from 'react';
import { Timer, Download, RefreshCw, FileText, Sparkles, Database, Trash2 } from 'lucide-react';

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
    <header className="border-b border-stone-800 bg-stone-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-stone-950 font-black shadow-lg shadow-amber-500/10">
            <Timer className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-stone-100 leading-tight">
                CubeProgression
              </h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                csTimer Analytics
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Speedcubing solve time progression & statistical shift analyzer
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSaved && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium"
              title="Data is persisted across reloads in browser IndexedDB storage"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Saved locally</span>
              {storageUsageMB !== undefined && storageUsageMB > 0 && (
                <span className="text-emerald-500/80 font-mono text-[11px]">({storageUsageMB} MB)</span>
              )}
            </div>
          )}

          {fileName && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800/80 border border-stone-700/60 text-stone-300 text-xs font-mono">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[140px]">{fileName}</span>
            </div>
          )}

          <button
            onClick={onLoadDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 shadow-md shadow-amber-500/10 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Load Sample Data</span>
            <span className="sm:hidden">Demo</span>
          </button>

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-800 hover:bg-stone-700/80 text-stone-200 border border-stone-700/60 transition-all active:scale-95 cursor-pointer"
            title="Export Period Summary Stats as CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {isSaved && onClearStorage ? (
            <button
              onClick={onClearStorage}
              className="p-1.5 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Reset Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onReset}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all cursor-pointer"
              title="Reset Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

