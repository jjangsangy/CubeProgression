import {
  Calendar,
  Database,
  FileText,
  FileUp,
  HelpCircle,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { useStorageNotice } from '../hooks/useStorageNotice';
import { useTheme } from '../theme/ThemeContext';
import type { GroupingPeriod, Session } from '../types';
import { CubeLoadingSpinner } from './CubeLoadingSpinner';
import { LoadingElapsedTimer } from './LoadingElapsedTimer';

interface FileUploaderProps {
  fileName?: string;
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
  onOpenInstructions?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  fileName,
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
  onOpenInstructions,
}) => {
  const storageNotice = useStorageNotice();
  const isSaved = propIsSaved ?? storageNotice.isSaved;
  const storageUsageMB = propStorageUsageMB ?? storageNotice.storageUsageMB;
  const savedNotice = propSavedNotice !== undefined ? propSavedNotice : storageNotice.savedNotice;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { colors } = useTheme();
  const [isDragging, setIsDragging] = useState(false);

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
    <section
      id="file-uploader"
      className="flex flex-col gap-6 rounded-2xl border border-stone-800 bg-stone-900 p-4 sm:p-6 text-stone-100 shadow-xl"
    >
      {/* File Dropzone & Session Controls Grid */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Hidden File Input */}
        <input
          id="file-input"
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
          id="file-dropzone"
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
          {isLoading ? (
            <div
              key="loading-container"
              className="animate-fade-in-scale flex w-full flex-col items-center justify-center gap-3.5 py-1"
            >
              {/* 3x3 Animated Speedcubing Cube Spinner */}
              <CubeLoadingSpinner size="md" />

              {/* Uploaded File Indicator Pill */}
              <div
                className="flex max-w-[90%] items-center gap-2 truncate rounded-full border border-amber-500/30 bg-stone-900 px-3 py-1 font-mono text-xs text-stone-200"
                style={{ borderColor: `${colors.accent}40` }}
              >
                <FileText
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  style={{ color: colors.accent }}
                />
                <span className="truncate">{uploadingFileName}</span>
              </div>

              {/* Progress Bar */}
              <div className="flex w-full max-w-xs flex-col gap-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] text-stone-300">
                  <LoadingElapsedTimer />
                  <span className="font-bold text-amber-300" style={{ color: colors.accentText }}>
                    {loadingProgress}%
                  </span>
                </div>

                {/* Bar Track */}
                <div className="h-2 w-full overflow-hidden rounded-full border border-stone-700/50 bg-stone-800 p-0.5">
                  <div
                    role="progressbar"
                    aria-valuenow={loadingProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(5, loadingProgress)}%`,
                      background: `linear-gradient(to right, ${colors.accent}, ${colors.accentHover})`,
                      boxShadow: `0 0 12px ${colors.accentMuted}`,
                    }}
                  />
                </div>
              </div>

              {/* Loading Stage Description */}
              <div className="flex animate-pulse items-center gap-1.5 text-xs font-medium text-amber-200/90">
                <span>{loadingStage}</span>
              </div>
            </div>
          ) : (
            <div
              key="upload-prompt"
              className="animate-fade-in-scale flex flex-col items-center justify-center"
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400"
                style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
              >
                <FileUp className="h-6 w-6 stroke-[2]" />
              </div>

              <h3 className="mb-1 text-sm font-bold text-stone-200">
                Upload{' '}
                <span className="text-amber-400" style={{ color: colors.accent }}>
                  cstimer.txt
                </span>{' '}
                or{' '}
                <span className="text-amber-400" style={{ color: colors.accent }}>
                  .json
                </span>
              </h3>

              <p className="mb-3 max-w-xs text-xs leading-relaxed text-stone-400">
                Drag and drop your csTimer export file here, or{' '}
                <button
                  type="button"
                  id="browse-files"
                  onClick={() => {
                    if (!isLoading) fileInputRef.current?.click();
                  }}
                  className="cursor-pointer font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  style={{ color: colors.accent }}
                >
                  click to browse
                </button>
                .
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-md border border-stone-700 bg-stone-800 px-2.5 py-1 font-mono text-[11px] text-stone-300">
                  .txt / .json
                </span>
                <span className="text-xs text-stone-500">or</span>
                <button
                  type="button"
                  id="load-sample-data"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadDemo();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold whitespace-nowrap text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  style={{ color: colors.accent }}
                >
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Load Sample Data
                </button>
              </div>

              {onOpenInstructions && (
                <button
                  id="export-guide"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenInstructions();
                  }}
                  className="mt-3.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-300 active:scale-95"
                  title="How to export your solves from csTimer"
                >
                  <HelpCircle
                    className="h-3.5 w-3.5 text-amber-400"
                    style={{ color: colors.accent }}
                  />
                  <span>How to export from csTimer?</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Configuration Controls (7 columns on large screens) */}
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-stone-800/80 bg-stone-950/60 p-5 lg:col-span-7">
          {/* Row 1: Session Selector */}
          <div>
            <label
              htmlFor="session-selector"
              className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-300 uppercase"
            >
              <Layers
                className="h-3.5 w-3.5 shrink-0 text-amber-400"
                style={{ color: colors.accent }}
              />
              <span>
                <span className="hidden sm:inline">Select </span>Session ({sessions.length}
                <span className="hidden sm:inline"> available</span>)
              </span>
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-300 uppercase">
                <Calendar
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  style={{ color: colors.accent }}
                />
                <span>
                  Grouping Period<span className="hidden sm:inline"> for Aggregations</span>
                </span>
              </span>
              {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
                <span className="text-[11px] font-medium text-amber-400 whitespace-nowrap">
                  {customBatchSize} solves per group
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'daily', label: 'Daily', desc: 'Per Day', mobileDesc: 'Day' },
                { id: 'weekly', label: 'Weekly', desc: 'Per Week', mobileDesc: 'Week' },
                { id: 'monthly', label: 'Monthly', desc: 'Per Month', mobileDesc: 'Month' },
                {
                  id: 'customBatch',
                  label: 'By Solve Count',
                  desc: 'Custom Batch Size',
                  mobileDesc: 'Batch',
                },
              ].map((item) => {
                const isActive =
                  groupingPeriod === item.id ||
                  (item.id === 'customBatch' && groupingPeriod === 'batch50');
                return (
                  <button
                    type="button"
                    id={`grouping-${item.id}`}
                    key={item.id}
                    aria-pressed={isActive}
                    onClick={() => onChangeGrouping(item.id as GroupingPeriod)}
                    className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer min-h-[54px] sm:min-h-[58px] flex flex-col justify-center ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 shadow-md'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: `${colors.accent}20`,
                            borderColor: colors.accent,
                            color: colors.accentText,
                          }
                        : undefined
                    }
                  >
                    <div className="text-xs leading-tight font-bold">{item.label}</div>
                    <div className="mt-0.5 text-[10px] text-stone-500 truncate">
                      <span className="hidden sm:inline">{item.desc}</span>
                      <span className="sm:hidden">{item.mobileDesc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Batch Size Controls (shown when grouping by solve count) */}
            {(groupingPeriod === 'customBatch' || groupingPeriod === 'batch50') && (
              <div
                className="fade-in flex animate-in flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-amber-500/30 bg-stone-900/90 p-3 duration-150"
                style={{ borderColor: `${colors.accent}40` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-stone-300">Solves per group:</span>

                  {/* Preset pills */}
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50, 100].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        id={`batch-preset-${preset}`}
                        onClick={() => onChangeCustomBatchSize(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          customBatchSize === preset
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                        style={
                          customBatchSize === preset
                            ? { backgroundColor: `${colors.accent}30`, color: colors.accentText }
                            : undefined
                        }
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Number Input */}
                <div className="flex items-center gap-1.5 pt-1 sm:pt-0 border-t border-stone-800/60 sm:border-0">
                  <span className="text-xs text-stone-400">Custom:</span>
                  <input
                    type="number"
                    aria-label="Custom solves per group"
                    min="2"
                    max="1000"
                    value={customBatchSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val > 0) {
                        onChangeCustomBatchSize(val);
                      }
                    }}
                    className="w-16 rounded-lg border border-stone-700 bg-stone-950 px-2 py-1 text-center font-mono text-base sm:text-xs text-stone-100 focus:border-amber-400 focus:outline-none"
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
        <div
          id="storage-status"
          className="flex flex-row items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950/80 px-3 py-2 sm:px-4 sm:py-2.5 text-xs text-stone-300"
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full"
              style={{ backgroundColor: colors.accent }}
            />
            <Database className="h-3.5 w-3.5 shrink-0" style={{ color: colors.accent }} />
            <span className="shrink-0 font-semibold text-stone-200">Storage</span>
            {fileName && (
              <span
                id="storage-filename"
                className="flex items-center gap-1 rounded-md border border-stone-700/60 bg-stone-800/80 p-1 sm:px-2 sm:py-0.5 font-mono text-[11px] text-stone-300 min-w-0 overflow-hidden shrink max-w-[130px] sm:max-w-[240px] md:max-w-[340px] lg:max-w-[460px]"
                title={fileName}
              >
                <FileText
                  className="h-3.5 w-3.5 sm:h-3 sm:w-3 shrink-0 text-amber-400"
                  style={{ color: colors.accent }}
                />
                <span className="sr-only sm:not-sr-only sm:inline-block truncate">{fileName}</span>
              </span>
            )}
            {storageUsageMB !== undefined && storageUsageMB > 0 && (
              <span className="shrink-0 rounded bg-stone-800 px-1.5 py-0.5 sm:px-2 font-mono text-[10px] text-stone-300">
                {storageUsageMB} MB
              </span>
            )}
          </div>

          {onClearStorage && (
            <button
              id="clear-saved-storage"
              type="button"
              onClick={onClearStorage}
              aria-label="Clear Saved"
              className="flex shrink-0 cursor-pointer items-center gap-1 font-medium text-stone-400 transition-colors hover:text-rose-400 hover:underline whitespace-nowrap text-xs"
              title="Clear saved data from browser storage"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 shrink-0" />
              <span className="hidden sm:inline">Clear Saved</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>
      )}

      {/* Notice string if provided */}
      {savedNotice && !errorMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs"
          style={{
            borderColor: `${colors.accent}40`,
            backgroundColor: `${colors.accent}18`,
            color: colors.accentText,
          }}
        >
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 shrink-0" style={{ color: colors.accent }} />
            <span>{savedNotice}</span>
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400"
        >
          <span className="font-bold tracking-wider uppercase">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </section>
  );
};
