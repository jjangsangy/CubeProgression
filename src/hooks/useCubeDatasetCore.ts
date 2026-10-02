import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GlobalStats, GroupingPeriod, PeriodGroup, Session } from '../types';
import { parseCsTimerFile } from '../utils/csTimerParser';
import { exportPeriodStatsCsv } from '../utils/csvExport';
import {
  clearSavedDataset,
  getSavedDataset,
  getStorageInfo,
  saveDataset,
} from '../utils/dbStorage';
import { generateSampleData } from '../utils/sampleData';
import { calculateGlobalStats, groupSolvesByPeriod } from '../utils/statsMath';
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
  handleExportCSV: () => void;
}

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

  // Initial check for stored dataset in IndexedDB on mount
  useEffect(() => {
    let isCancelled = false;

    const initializeDataset = async () => {
      setIsLoading(true);
      setUploadingFileName('browser_storage');
      setLoadingProgress(20);
      setLoadingStage('Checking IndexedDB storage for saved csTimer data...');
      setErrorMsg(null);
      storageNoticeStore.resetStorageState();

      try {
        const saved = await getSavedDataset();

        if (isCancelled) return;

        if (saved?.sessions && saved.sessions.length > 0) {
          storageNoticeStore.setIsSaved(true);

          const totalSolvesCount = saved.sessions.reduce((acc, s) => acc + s.solves.length, 0);
          storageNoticeStore.showNotice(
            `Restored ${totalSolvesCount.toLocaleString()} solves across ${saved.sessions.length} sessions from IndexedDB (${saved.fileName})`,
          );

          // Atomic synchronous state flush unblocks rendering immediately
          setSessions(saved.sessions);
          setSelectedSessionId(saved.selectedSessionId || saved.sessions[0].id);
          setFileName(saved.fileName || 'cstimer_saved.txt');
          if (saved.groupingPeriod) setGroupingPeriod(saved.groupingPeriod);
          if (saved.customBatchSize) setCustomBatchSize(saved.customBatchSize);
          setLoadingProgress(100);
          setLoadingStage('Loaded saved data successfully!');
          setIsLoading(false);

          // Background storage estimate
          getStorageInfo()
            .then((info) => {
              if (info && !isCancelled) storageNoticeStore.setStorageUsageMB(info.usageMB);
            })
            .catch(() => null);
          return;
        }
      } catch (err) {
        console.error('Failed to load dataset from IndexedDB:', err);
      }

      if (isCancelled) return;

      // Fall back to sample dataset if nothing was saved
      setIsLoading(true);
      setUploadingFileName('cstimer_demo_350solves.txt');
      setLoadingProgress(15);
      setLoadingStage('Initializing sample csTimer dataset...');
      setErrorMsg(null);
      storageNoticeStore.clearNotice();

      try {
        const demoSessions = generateSampleData();
        const demoFileName = 'cstimer_demo_350solves.txt';
        const initialSessId = demoSessions[0].id;

        await saveDataset({
          fileName: demoFileName,
          sessions: demoSessions,
          selectedSessionId: initialSessId,
          groupingPeriod: 'daily',
          customBatchSize: 50,
        });

        if (isCancelled) return;

        storageNoticeStore.setIsSaved(true);
        getStorageInfo()
          .then((info) => {
            if (info && !isCancelled) storageNoticeStore.setStorageUsageMB(info.usageMB);
          })
          .catch(() => null);

        // Atomic synchronous state flush
        setSessions(demoSessions);
        setSelectedSessionId(initialSessId);
        setFileName(demoFileName);
        setLoadingProgress(100);
        setLoadingStage('Complete!');
        setIsLoading(false);
      } catch (err) {
        if (isCancelled) return;
        console.error(err);
        setErrorMsg('Failed to load sample dataset.');
        setIsLoading(false);
      }
    };

    initializeDataset();

    return () => {
      isCancelled = true;
    };
  }, []);

  const loadSampleData = useCallback(async () => {
    setIsLoading(true);
    setUploadingFileName('cstimer_demo_350solves.txt');
    setLoadingProgress(15);
    setLoadingStage('Initializing sample csTimer dataset...');
    setErrorMsg(null);
    storageNoticeStore.clearNotice();

    try {
      const demoSessions = generateSampleData();
      const demoFileName = 'cstimer_demo_350solves.txt';
      const initialSessId = demoSessions[0].id;

      await saveDataset({
        fileName: demoFileName,
        sessions: demoSessions,
        selectedSessionId: initialSessId,
        groupingPeriod,
        customBatchSize,
      });

      storageNoticeStore.setIsSaved(true);
      getStorageInfo()
        .then((info) => {
          if (info) storageNoticeStore.setStorageUsageMB(info.usageMB);
        })
        .catch(() => null);

      // Atomic synchronous state flush
      setSessions(demoSessions);
      setSelectedSessionId(initialSessId);
      setFileName(demoFileName);
      setLoadingProgress(100);
      setLoadingStage('Complete!');
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load sample dataset.');
      setIsLoading(false);
    }
  }, [groupingPeriod, customBatchSize]);

  const handleFileUpload = useCallback(
    (file: File) => {
      setIsLoading(true);
      setUploadingFileName(file.name);
      setLoadingProgress(15);
      setLoadingStage('Reading csTimer file format...');
      setErrorMsg(null);
      storageNoticeStore.clearNotice();

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) throw new Error('File is empty.');

          const parsedSessions = parseCsTimerFile(content);
          const initialSessionId = parsedSessions[0].id;

          const [, info] = await Promise.all([
            saveDataset({
              fileName: file.name,
              sessions: parsedSessions,
              selectedSessionId: initialSessionId,
              groupingPeriod,
              customBatchSize,
            }),
            getStorageInfo().catch(() => null),
          ]);

          storageNoticeStore.setIsSaved(true);
          if (info) storageNoticeStore.setStorageUsageMB(info.usageMB);

          const totalSolvesCount = parsedSessions.reduce((acc, s) => acc + s.solves.length, 0);
          storageNoticeStore.showNotice(
            `Saved ${totalSolvesCount.toLocaleString()} solves across ${parsedSessions.length} sessions to browser storage (${file.name})`,
          );

          // Atomic synchronous state flush
          setSessions(parsedSessions);
          setSelectedSessionId(initialSessionId);
          setFileName(file.name);
          setLoadingProgress(100);
          setLoadingStage('Done!');
          setIsLoading(false);
        } catch (err: unknown) {
          console.error(err);
          const message = err instanceof Error ? err.message : 'Error parsing csTimer file.';
          setErrorMsg(message);
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setErrorMsg('Error reading uploaded file.');
        setIsLoading(false);
      };
      reader.readAsText(file);
    },
    [groupingPeriod, customBatchSize],
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

  const handleExportCSV = useCallback(() => {
    exportPeriodStatsCsv(periodGroups, activeSession?.name);
  }, [periodGroups, activeSession?.name]);

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
    handleExportCSV,
  };
}
