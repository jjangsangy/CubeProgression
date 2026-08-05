import React, { useRef, useState, useEffect } from 'react';
import { Calendar, Layers, FileUp, Sparkles, FileText, Timer, Database, HardDrive, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Session, GroupingPeriod } from '../types';
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
  isSaved = false,
  storageUsageMB,
  savedNotice,
  onClearStorage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timerVal, setTimerVal] = useState<number>(0);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setTimerVal(0);
      const startTime = Date.now();
      interval = setInterval(() => {
        setTimerVal((Date.now() - startTime) / 1000);
      }, 35);
    }
    return () => clearInterval(interval);
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
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl text-stone-100 flex flex-col gap-6">
      {/* File Dropzone & Session Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Drag & Drop Box / Loading State (5 columns on large screens) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isLoading) fileInputRef.current?.click();
          }}
          className={`lg:col-span-5 border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[220px] relative overflow-hidden ${
            isLoading
              ? 'border-amber-500/60 bg-stone-950/80 cursor-wait'
              : isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[0.99] cursor-pointer'
              : 'border-stone-700/80 hover:border-amber-500/50 hover:bg-stone-800/40 bg-stone-950/40 cursor-pointer'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.json"
            disabled={isLoading}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center justify-center gap-3.5 py-1"
              >
                {/* 3x3 Animated Speedcubing Cube Spinner */}
                <CubeLoadingSpinner size="md" />

                {/* Uploaded File Indicator Pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-amber-500/30 text-stone-200 text-xs font-mono max-w-[90%] truncate">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{uploadingFileName}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-300">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Timer className="w-3 h-3 animate-spin text-amber-400" />
                      {timerVal.toFixed(2)}s
                    </span>
                    <span className="font-bold text-amber-300">{loadingProgress}%</span>
                  </div>

                  {/* Bar Track */}
                  <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-700/50">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      initial={{ width: '5%' }}
                      animate={{ width: `${Math.max(5, loadingProgress)}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Loading Stage Description */}
                <div className="text-xs font-medium text-amber-200/90 flex items-center gap-1.5 animate-pulse">
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
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <FileUp className="w-6 h-6 stroke-[2]" />
                </div>

                <h3 className="font-bold text-stone-200 text-sm mb-1">
                  Upload <span className="text-amber-400">cstimer.txt</span> or <span className="text-amber-400">.json</span>
                </h3>

                <p className="text-xs text-stone-400 max-w-xs mb-3 leading-relaxed">
                  Drag and drop your csTimer export file here, or click to browse.
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-stone-800 border border-stone-700 text-stone-300">
                    .txt / .json
                  </span>
                  <span className="text-xs text-stone-500">or</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadDemo();
                    }}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Load Sample Data
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Configuration Controls (7 columns on large screens) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5 bg-stone-950/60 border border-stone-800/80 rounded-2xl p-5">
          {/* Row 1: Session Selector */}
          <div>
            <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Select Session ({sessions.length} available)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Grouping Period for Aggregations
              </label>
              {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
                <span className="text-[11px] text-amber-400 font-medium">
                  {customBatchSize} solves per group
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
                    key={item.id}
                    onClick={() => onChangeGrouping(item.id as GroupingPeriod)}
                    className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-md'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Batch Size Controls (shown when grouping by solve count) */}
            {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
              <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                <span className="text-xs font-medium text-stone-300">Solves per group:</span>
                
                {/* Preset pills */}
                <div className="flex items-center gap-1.5">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
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
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-stone-400">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={customBatchSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        onChangeCustomBatchSize(val);
                      }
                    }}
                    className="w-16 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono text-stone-100 text-center focus:outline-none focus:border-amber-400"
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
        <div className="bg-stone-950/80 border border-stone-800 rounded-xl px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-stone-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-stone-200">
              Persistent Storage Active (IndexedDB)
            </span>
            <span className="text-stone-500 hidden sm:inline">&bull;</span>
            <span className="text-stone-400 text-[11px] hidden sm:inline">
              Your dataset stays saved across browser reloads
            </span>
            {storageUsageMB !== undefined && storageUsageMB > 0 && (
              <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px] ml-1">
                {storageUsageMB} MB
              </span>
            )}
          </div>

          {onClearStorage && (
            <button
              onClick={onClearStorage}
              className="text-stone-400 hover:text-rose-400 hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer ml-auto"
              title="Clear saved data from browser storage"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Saved Storage</span>
            </button>
          )}
        </div>
      )}

      {/* Notice string if provided */}
      {savedNotice && !errorMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
