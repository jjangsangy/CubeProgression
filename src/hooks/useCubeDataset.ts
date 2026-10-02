import { useEffect, useState } from 'react';
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

const stepDelay = (ms: number) =>
  new Promise((res) => setTimeout(res, import.meta.env.MODE === 'test' ? 0 : ms));

export interface UseCubeDatasetReturn {
  // State
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod: GroupingPeriod;
  customBatchSize: number;
  fileName: string;
  errorMsg: string | null;

  // Storage
  isSaved: boolean;
  storageUsageMB: number | undefined;
  savedNotice: string | null;

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

export function useCubeDataset(): UseCubeDatasetReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [groupingPeriod, setGroupingPeriod] = useState<GroupingPeriod>('daily');
  const [customBatchSize, setCustomBatchSize] = useState<number>(50);
  const [fileName, setFileName] = useState<string>('cstimer_demo.txt');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Storage states
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [storageUsageMB, setStorageUsageMB] = useState<number | undefined>(undefined);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Loading animation states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);
  const [loadingStage, setLoadingStage] = useState<string>(
    'Checking IndexedDB storage for saved csTimer data...',
  );
  const [uploadingFileName, setUploadingFileName] = useState<string>('browser_storage');

  // Initial check for stored dataset in IndexedDB on mount
  useEffect(() => {
    const initializeDataset = async () => {
      setIsLoading(true);
      setUploadingFileName('browser_storage');
      setLoadingProgress(20);
      setLoadingStage('Checking IndexedDB storage for saved csTimer data...');
      setErrorMsg(null);

      try {
        const saved = await getSavedDataset();
        if (saved?.sessions && saved.sessions.length > 0) {
          setLoadingProgress(60);
          setLoadingStage(`Restoring saved dataset (${saved.fileName})...`);

          setSessions(saved.sessions);
          setSelectedSessionId(saved.selectedSessionId || saved.sessions[0].id);
          setFileName(saved.fileName || 'cstimer_saved.txt');
          if (saved.groupingPeriod) setGroupingPeriod(saved.groupingPeriod);
          if (saved.customBatchSize) setCustomBatchSize(saved.customBatchSize);

          setIsSaved(true);
          const info = await getStorageInfo();
          if (info) setStorageUsageMB(info.usageMB);

          const totalSolvesCount = saved.sessions.reduce((acc, s) => acc + s.solves.length, 0);
          setSavedNotice(
            `Restored ${totalSolvesCount.toLocaleString()} solves across ${saved.sessions.length} sessions from IndexedDB (${saved.fileName})`,
          );

          setLoadingProgress(100);
          setLoadingStage('Loaded saved data successfully!');
          await stepDelay(120);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to load dataset from IndexedDB:', err);
      }

      // Fall back to sample dataset if nothing was saved
      setIsLoading(true);
      setUploadingFileName('cstimer_demo_350solves.txt');
      setLoadingProgress(15);
      setLoadingStage('Initializing sample csTimer dataset...');
      setErrorMsg(null);
      setSavedNotice(null);

      try {
        await stepDelay(120);
        setLoadingProgress(50);
        setLoadingStage('Generating 350 solve logs & session history...');
        const demoSessions = generateSampleData();

        await stepDelay(80);
        setLoadingProgress(80);
        setLoadingStage('Computing rolling averages & variance...');

        const demoFileName = 'cstimer_demo_350solves.txt';
        const initialSessId = demoSessions[0].id;

        setSessions(demoSessions);
        setSelectedSessionId(initialSessId);
        setFileName(demoFileName);

        await saveDataset({
          fileName: demoFileName,
          sessions: demoSessions,
          selectedSessionId: initialSessId,
          groupingPeriod: 'daily',
          customBatchSize: 50,
        });

        setIsSaved(true);
        const info = await getStorageInfo();
        if (info) setStorageUsageMB(info.usageMB);

        setLoadingProgress(100);
        setLoadingStage('Complete!');

        await stepDelay(120);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load sample dataset.');
        setIsLoading(false);
      }
    };

    initializeDataset();
  }, []);

  const loadSampleData = async () => {
    setIsLoading(true);
    setUploadingFileName('cstimer_demo_350solves.txt');
    setLoadingProgress(15);
    setLoadingStage('Initializing sample csTimer dataset...');
    setErrorMsg(null);
    setSavedNotice(null);

    try {
      await stepDelay(120);
      setLoadingProgress(50);
      setLoadingStage('Generating 350 solve logs & session history...');
      const demoSessions = generateSampleData();

      await stepDelay(80);
      setLoadingProgress(80);
      setLoadingStage('Computing rolling averages & variance...');

      const demoFileName = 'cstimer_demo_350solves.txt';
      const initialSessId = demoSessions[0].id;

      setSessions(demoSessions);
      setSelectedSessionId(initialSessId);
      setFileName(demoFileName);

      // Save sample data to IndexedDB
      await saveDataset({
        fileName: demoFileName,
        sessions: demoSessions,
        selectedSessionId: initialSessId,
        groupingPeriod,
        customBatchSize,
      });

      setIsSaved(true);
      const info = await getStorageInfo();
      if (info) setStorageUsageMB(info.usageMB);

      setLoadingProgress(100);
      setLoadingStage('Complete!');

      await stepDelay(120);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load sample dataset.');
      setIsLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    setUploadingFileName(file.name);
    setLoadingProgress(15);
    setLoadingStage('Reading csTimer file format...');
    setErrorMsg(null);
    setSavedNotice(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoadingProgress(35);
        setLoadingStage('Decoding session export JSON/Text...');
        await stepDelay(150);

        const content = e.target?.result as string;
        if (!content) throw new Error('File is empty.');

        setLoadingProgress(60);
        setLoadingStage('Parsing solves, timestamps & scrambles...');
        await stepDelay(180);

        const parsedSessions = parseCsTimerFile(content);

        setLoadingProgress(80);
        setLoadingStage('Persisting dataset to IndexedDB browser storage...');
        await stepDelay(150);

        const initialSessionId = parsedSessions[0].id;
        setSessions(parsedSessions);
        setSelectedSessionId(initialSessionId);
        setFileName(file.name);

        // Save to IndexedDB (supports 100s of MBs)
        await saveDataset({
          fileName: file.name,
          sessions: parsedSessions,
          selectedSessionId: initialSessionId,
          groupingPeriod,
          customBatchSize,
        });

        setIsSaved(true);
        const info = await getStorageInfo();
        if (info) setStorageUsageMB(info.usageMB);

        const totalSolvesCount = parsedSessions.reduce((acc, s) => acc + s.solves.length, 0);
        setSavedNotice(
          `Saved ${totalSolvesCount.toLocaleString()} solves across ${parsedSessions.length} sessions to browser storage (${file.name})`,
        );

        setLoadingProgress(100);
        setLoadingStage('Done!');

        await stepDelay(120);
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
  };

  const handleClearStorage = () => {
    setIsSaved(false);
    setStorageUsageMB(undefined);
    setSavedNotice(null);
    setSessions([]);
    setSelectedSessionId('');
    setFileName('');
    setErrorMsg(null);
    clearSavedDataset().catch((err) => console.error('Failed to clear storage:', err));
  };

  const handleSelectSession = (id: string) => {
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
  };

  const handleChangeGrouping = (period: GroupingPeriod) => {
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
  };

  const handleChangeCustomBatchSize = (size: number) => {
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
  };

  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;

  const periodGroups = activeSession
    ? groupSolvesByPeriod(activeSession.solves, groupingPeriod, customBatchSize)
    : [];

  const globalStats = activeSession ? calculateGlobalStats(activeSession.solves) : null;

  const handleExportCSV = () => {
    exportPeriodStatsCsv(periodGroups, activeSession?.name);
  };

  return {
    sessions,
    selectedSessionId,
    groupingPeriod,
    customBatchSize,
    fileName,
    errorMsg,
    isSaved,
    storageUsageMB,
    savedNotice,
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
