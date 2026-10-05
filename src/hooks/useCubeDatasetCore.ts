import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GlobalStats, GroupingPeriod, PeriodGroup, Session } from '../types';
import {
  type DatasetStage,
  DEMO_FILE_NAME,
  datasetLoader,
  type LoadedDataset,
} from '../utils/datasetLoader';
import { clearSavedDataset, getStorageInfo, saveDataset } from '../utils/dbStorage';
import { yieldToMain } from '../utils/scheduler';
import { calculateGlobalStats, groupSolvesByPeriod } from '../utils/statsMath';
import { ensureTemporal } from '../utils/temporalLoader';
import { storageNoticeStore } from './useStorageNotice';

export interface UseCubeDatasetCoreReturn {
  // State
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod: GroupingPeriod;
  customBatchSize: number;
  fileName: string;
  errorMsg: string | null;

  // Loading
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  uploadingFileName: string;

  // Derived
  activeSession: Session | null;
  periodGroups: PeriodGroup[];
  globalStats: GlobalStats | null;

  // Actions
  loadSampleData: () => Promise<void>;
  handleFileUpload: (file: File) => void;
  handleClearStorage: () => void;
  handleSelectSession: (id: string) => void;
  handleChangeGrouping: (period: GroupingPeriod) => void;
  handleChangeCustomBatchSize: (size: number) => void;
}

/** Loader stages mapped onto the loading overlay's progress bar and copy. */
const STAGE_LOADING_STATE: Record<DatasetStage, { progress: number; stage: string }> = {
  reading: { progress: 35, stage: 'Reading csTimer file format...' },
  parsing: { progress: 60, stage: 'Parsing solves and computing averages...' },
  persisting: { progress: 85, stage: 'Saving dataset to browser storage...' },
  ready: { progress: 100, stage: 'Complete!' },
};

export function useCubeDatasetCore(): UseCubeDatasetCoreReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [groupingPeriod, setGroupingPeriod] = useState<GroupingPeriod>('daily');
  const [customBatchSize, setCustomBatchSize] = useState<number>(50);
  const [fileName, setFileName] = useState<string>('cstimer_demo.txt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loading animation states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);
  const [loadingStage, setLoadingStage] = useState<string>(
    'Checking IndexedDB storage for saved csTimer data...',
  );
  const [uploadingFileName, setUploadingFileName] = useState<string>('browser_storage');

  const reportStage = useCallback((stage: DatasetStage) => {
    const state = STAGE_LOADING_STATE[stage];
    setLoadingProgress(state.progress);
    setLoadingStage(state.stage);
  }, []);

  const commitLoadedDataset = useCallback((loaded: LoadedDataset) => {
    setSessions(loaded.sessions);
    setSelectedSessionId(loaded.selectedSessionId);
    setFileName(loaded.fileName);
    if (loaded.groupingPeriod) setGroupingPeriod(loaded.groupingPeriod);
    if (loaded.customBatchSize) setCustomBatchSize(loaded.customBatchSize);
  }, []);

  const estimateStorage = useCallback((isCancelled?: () => boolean) => {
    getStorageInfo()
      .then((info) => {
        if (info && !isCancelled?.()) storageNoticeStore.setStorageUsageMB(info.usageMB);
      })
      .catch(() => null);
  }, []);

  // Initial check for stored dataset in IndexedDB on mount
  useEffect(() => {
    let isCancelled = false;
    const isAborted = () => isCancelled;

    const initializeDataset = async () => {
      await ensureTemporal();
      setIsLoading(true);
      setUploadingFileName('browser_storage');
      setLoadingProgress(20);
      setLoadingStage('Checking IndexedDB storage for saved csTimer data...');
      setErrorMsg(null);
      storageNoticeStore.resetStorageState();

      try {
        const saved = await datasetLoader.loadStored();

        if (isAborted()) return;

        if (saved) {
          storageNoticeStore.setIsSaved(true);
          storageNoticeStore.showNotice(
            `Restored ${saved.totalSolvesCount.toLocaleString()} solves across ${saved.sessions.length} sessions from IndexedDB (${saved.fileName})`,
          );

          // Yield to main thread so browser can process paint/input before state commit
          await yieldToMain();
          if (isAborted()) return;

          // Atomic state flush unblocks rendering
          commitLoadedDataset(saved);
          setLoadingProgress(100);
          setLoadingStage('Loaded saved data successfully!');
          setIsLoading(false);

          estimateStorage(isAborted);
          return;
        }
      } catch (err) {
        console.error('Failed to load dataset from IndexedDB:', err);
      }

      if (isAborted()) return;

      // Fall back to sample dataset if nothing was saved
      setIsLoading(true);
      setUploadingFileName(DEMO_FILE_NAME);
      setLoadingProgress(15);
      setLoadingStage('Initializing sample csTimer dataset...');
      setErrorMsg(null);
      storageNoticeStore.clearNotice();

      try {
        const demo = await datasetLoader.loadDemo({
          groupingPeriod: 'daily',
          customBatchSize: 50,
          onStage: reportStage,
        });

        if (isAborted()) return;

        storageNoticeStore.setIsSaved(true);
        estimateStorage(isAborted);

        // Yield to main thread before committing state and executing derived math
        await yieldToMain();
        if (isAborted()) return;

        // Atomic state flush
        commitLoadedDataset(demo);
        setLoadingProgress(100);
        setLoadingStage('Complete!');
        setIsLoading(false);
      } catch (err) {
        if (isAborted()) return;
        console.error(err);
        setErrorMsg('Failed to load sample dataset.');
        setIsLoading(false);
      }
    };

    initializeDataset();

    return () => {
      isCancelled = true;
    };
  }, [commitLoadedDataset, estimateStorage, reportStage]);

  const loadSampleData = useCallback(async () => {
    await ensureTemporal();
    setIsLoading(true);
    setUploadingFileName(DEMO_FILE_NAME);
    setLoadingProgress(15);
    setLoadingStage('Initializing sample csTimer dataset...');
    setErrorMsg(null);
    storageNoticeStore.clearNotice();

    try {
      const demo = await datasetLoader.loadDemo({
        groupingPeriod,
        customBatchSize,
        onStage: reportStage,
      });

      storageNoticeStore.setIsSaved(true);
      estimateStorage();

      // Atomic synchronous state flush
      commitLoadedDataset(demo);
      setLoadingProgress(100);
      setLoadingStage('Complete!');
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load sample dataset.');
      setIsLoading(false);
    }
  }, [groupingPeriod, customBatchSize, commitLoadedDataset, estimateStorage, reportStage]);

  const handleFileUpload = useCallback(
    (file: File) => {
      setIsLoading(true);
      setUploadingFileName(file.name);
      setLoadingProgress(15);
      setLoadingStage('Reading csTimer file format...');
      setErrorMsg(null);
      storageNoticeStore.clearNotice();

      void (async () => {
        try {
          await ensureTemporal();

          const loaded = await datasetLoader.loadUploaded(file, {
            groupingPeriod,
            customBatchSize,
            onStage: reportStage,
          });

          storageNoticeStore.setIsSaved(true);
          const info = await getStorageInfo().catch(() => null);
          if (info) storageNoticeStore.setStorageUsageMB(info.usageMB);

          storageNoticeStore.showNotice(
            `Saved ${loaded.totalSolvesCount.toLocaleString()} solves across ${loaded.sessions.length} sessions to browser storage (${file.name})`,
          );

          // Atomic synchronous state flush
          commitLoadedDataset(loaded);
          setLoadingProgress(100);
          setLoadingStage('Done!');
          setIsLoading(false);
        } catch (err: unknown) {
          console.error(err);
          const message = err instanceof Error ? err.message : 'Error parsing csTimer file.';
          setErrorMsg(message);
          setIsLoading(false);
        }
      })();
    },
    [groupingPeriod, customBatchSize, commitLoadedDataset, reportStage],
  );

  const handleClearStorage = useCallback(() => {
    storageNoticeStore.resetStorageState();
    setSessions([]);
    setSelectedSessionId('');
    setFileName('');
    setErrorMsg(null);
    clearSavedDataset().catch((err) => console.error('Failed to clear storage:', err));
  }, []);

  const handleSelectSession = useCallback(
    (id: string) => {
      setSelectedSessionId(id);
      if (sessions.length > 0) {
        saveDataset({
          fileName,
          sessions,
          selectedSessionId: id,
          groupingPeriod,
          customBatchSize,
        }).catch((e) => console.error(e));
      }
    },
    [fileName, sessions, groupingPeriod, customBatchSize],
  );

  const handleChangeGrouping = useCallback(
    (period: GroupingPeriod) => {
      setGroupingPeriod(period);
      if (sessions.length > 0) {
        saveDataset({
          fileName,
          sessions,
          selectedSessionId,
          groupingPeriod: period,
          customBatchSize,
        }).catch((e) => console.error(e));
      }
    },
    [fileName, sessions, selectedSessionId, customBatchSize],
  );

  const handleChangeCustomBatchSize = useCallback(
    (size: number) => {
      setCustomBatchSize(size);
      if (sessions.length > 0) {
        saveDataset({
          fileName,
          sessions,
          selectedSessionId,
          groupingPeriod,
          customBatchSize: size,
        }).catch((e) => console.error(e));
      }
    },
    [fileName, sessions, selectedSessionId, groupingPeriod],
  );

  // Derived memoized values
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null,
    [sessions, selectedSessionId],
  );

  const periodGroups = useMemo(() => {
    if (!activeSession) return [];
    return groupSolvesByPeriod(activeSession.solves, groupingPeriod, customBatchSize);
  }, [activeSession, groupingPeriod, customBatchSize]);

  const globalStats = useMemo(() => {
    if (!activeSession) return null;
    return calculateGlobalStats(activeSession.solves);
  }, [activeSession]);

  return {
    sessions,
    selectedSessionId,
    groupingPeriod,
    customBatchSize,
    fileName,
    errorMsg,
    isLoading,
    loadingProgress,
    loadingStage,
    uploadingFileName,
    activeSession,
    periodGroups,
    globalStats,
    loadSampleData,
    handleFileUpload,
    handleClearStorage,
    handleSelectSession,
    handleChangeGrouping,
    handleChangeCustomBatchSize,
  };
}
