import {
  Calendar,
  Database,
  FileText,
  FileUp,
  Layers,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useStorageNotice } from '../hooks/useStorageNotice';
import type { GroupingPeriod, Session } from '../types';
import { CubeLoadingSpinner } from './CubeLoadingSpinner';

interface FileUploaderProps {
  sessions: Session[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  groupingPeriod: GroupingPeriod;
  onChangeGrouping: (period: GroupingPeriod) => void;
  customBatchSize: number;
  onChangeCustomBatchSize: (size: number) => void;
  onFileUpload: (file: File) => void;
  onLoadDemo: () => void;
  errorMsg?: string | null;
  isLoading?: boolean;
  loadingProgress?: number;
  loadingStage?: string;
  uploadingFileName?: string;
  isSaved?: boolean;
  storageUsageMB?: number;
  savedNotice?: string | null;
  onClearStorage?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  groupingPeriod,
  onChangeGrouping,
  customBatchSize,
  onChangeCustomBatchSize,
  onFileUpload,
  onLoadDemo,
  errorMsg,
  isLoading = false,
  loadingProgress = 0,
  loadingStage = 'Processing csTimer file...',
  uploadingFileName = 'cstimer_export.txt',
  isSaved: propIsSaved,
  storageUsageMB: propStorageUsageMB,
  savedNotice: propSavedNotice,
  onClearStorage,
}) => {
  const storageNotice = useStorageNotice();
  const isSaved = propIsSaved ?? storageNotice.isSaved;
  const storageUsageMB = propStorageUsageMB ?? storageNotice.storageUsageMB;
  const savedNotice = propSavedNotice !== undefined ? propSavedNotice : storageNotice.savedNotice;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timerVal, setTimerVal] = useState<number>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      setTimerVal(0);
      const startTime = Date.now();
      interval = setInterval(() => {
        setTimerVal((Date.now() - startTime) / 1000);
      }, 35);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoading && e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 text-stone-100 shadow-xl">
      {/* File Dropzone & Session Controls Grid */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".txt,.json"
          disabled={isLoading}
          className="hidden"
          aria-label="Upload csTimer file"
        />

        {/* Drag & Drop Box / Loading State (5 columns on large screens) */}
        <section
          aria-label="File upload dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lg:col-span-5 border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[250px] relative overflow-hidden ${
            isLoading
              ? 'border-amber-500/60 bg-stone-950/80 cursor-wait'
              : isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
                : 'border-stone-700/80 hover:border-amber-500/50 hover:bg-stone-800/40 bg-stone-950/40'
          }`}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex w-full flex-col items-center justify-center gap-3.5 py-1"
              >
                {/* 3x3 Animated Speedcubing Cube Spinner */}
                <CubeLoadingSpinner size="md" />

                {/* Uploaded File Indicator Pill */}
                <div className="flex max-w-[90%] items-center gap-2 truncate rounded-full border border-amber-500/30 bg-stone-900 px-3 py-1 font-mono text-xs text-stone-200">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">{uploadingFileName}</span>
                </div>

                {/* Progress Bar */}
                <div className="flex w-full max-w-xs flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-stone-300">
                    <span className="flex items-center gap-1 font-semibold text-amber-400">
                      <Timer className="h-3 w-3 animate-spin text-amber-400" />
                      {timerVal.toFixed(2)}s
                    </span>
                    <span className="font-bold text-amber-300">{loadingProgress}%</span>
                  </div>

                  {/* Bar Track */}
                  <div className="h-2 w-full overflow-hidden rounded-full border border-stone-700/50 bg-stone-800 p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      initial={{ width: '5%' }}
                      animate={{ width: `${Math.max(5, loadingProgress)}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Loading Stage Description */}
                <div className="flex animate-pulse items-center gap-1.5 text-xs font-medium text-amber-200/90">
                  <span>{loadingStage}</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <FileUp className="h-6 w-6 stroke-[2]" />
                </div>

                <h3 className="mb-1 text-sm font-bold text-stone-200">
                  Upload <span className="text-amber-400">cstimer.txt</span> or{' '}
                  <span className="text-amber-400">.json</span>
                </h3>

                <p className="mb-3 max-w-xs text-xs leading-relaxed text-stone-400">
                  Drag and drop your csTimer export file here, or{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLoading) fileInputRef.current?.click();
                    }}
                    className="cursor-pointer font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  >
                    click to browse
                  </button>
                  .
                </p>

                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-stone-700 bg-stone-800 px-2.5 py-1 font-mono text-[11px] text-stone-300">
                    .txt / .json
                  </span>
                  <span className="text-xs text-stone-500">or</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadDemo();
                    }}
                    className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    Load Sample Data
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Configuration Controls (7 columns on large screens) */}
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-stone-800/80 bg-stone-950/60 p-5 lg:col-span-7">
          {/* Row 1: Session Selector */}
          <div>
            <label
              htmlFor="session-selector"
              className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-300 uppercase"
            >
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              Select Session ({sessions.length} available)
            </label>
            <select
              id="session-selector"
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm sm:text-xs font-medium text-stone-100 transition-colors focus:border-amber-500 focus:outline-none"
            >
              {sessions.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {sess.name} ({sess.solves.length} solves)
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Grouping Period Toggle */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-300 uppercase">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                Grouping Period for Aggregations
              </span>
              {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
                <span className="text-[11px] font-medium text-amber-400">
                  {customBatchSize} solves per group
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'daily', label: 'Daily', desc: 'Per Day' },
                { id: 'weekly', label: 'Weekly', desc: 'Per Week' },
                { id: 'monthly', label: 'Monthly', desc: 'Per Month' },
                { id: 'customBatch', label: 'By Solve Count', desc: 'Custom Batch Size' },
              ].map((item) => {
                const isActive =
                  groupingPeriod === item.id ||
                  (item.id === 'customBatch' && groupingPeriod === 'batch50');
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onChangeGrouping(item.id as GroupingPeriod)}
                    className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-md'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs leading-tight font-bold">{item.label}</div>
                    <div className="mt-0.5 text-[10px] text-stone-500">{item.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Batch Size Controls (shown when grouping by solve count) */}
            {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
              <div className="fade-in flex animate-in flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-stone-900/90 p-3 duration-150">
                <span className="text-xs font-medium text-stone-300">Solves per group:</span>

                {/* Preset pills */}
                <div className="flex items-center gap-1.5">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => onChangeCustomBatchSize(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                        customBatchSize === preset
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom Number Input */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-stone-400">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={customBatchSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val > 0) {
                        onChangeCustomBatchSize(val);
                      }
                    }}
                    className="w-16 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-center font-mono text-sm sm:text-xs text-stone-100 focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-xs text-stone-400">solves</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Status & Persistence Info */}
      {isSaved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-950/80 px-4 py-2.5 text-xs text-stone-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
            <Database className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="font-semibold text-stone-200">
              Persistent Storage Active (IndexedDB)
            </span>
            <span className="hidden text-stone-500 sm:inline">&bull;</span>
            <span className="hidden text-[11px] text-stone-400 sm:inline">
              Your dataset stays saved across browser reloads
            </span>
            {storageUsageMB !== undefined && storageUsageMB > 0 && (
              <span className="ml-1 rounded bg-stone-800 px-2 py-0.5 font-mono text-[10px] text-stone-300">
                {storageUsageMB} MB
              </span>
            )}
          </div>

          {onClearStorage && (
            <button
              type="button"
              onClick={onClearStorage}
              className="ml-auto flex cursor-pointer items-center gap-1 font-medium text-stone-400 transition-colors hover:text-rose-400 hover:underline"
              title="Clear saved data from browser storage"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Saved Storage</span>
            </button>
          )}
        </div>
      )}

      {/* Notice string if provided */}
      {savedNotice && !errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3.5 py-2 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>{savedNotice}</span>
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-800/80 bg-rose-950/60 p-3 text-xs text-rose-300">
          <span className="font-bold tracking-wider uppercase">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
