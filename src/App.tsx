import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FileUploader } from './components/FileUploader';
import { MetricsOverviewCards } from './components/MetricsOverviewCards';
import { ProgressionChart } from './components/ProgressionChart';
import { PbProgressionChart } from './components/PbProgressionChart';
import { DailyDistributionBoxPlot } from './components/DailyDistributionBoxPlot';
import { DensityShiftChart } from './components/DensityShiftChart';
import { MetricsEvolutionChart } from './components/MetricsEvolutionChart';
import { SolvesTable } from './components/SolvesTable';

import { Session, GroupingPeriod } from './types';
import { parseCsTimerFile } from './utils/csTimerParser';
import { generateSampleData } from './utils/sampleData';
import { groupSolvesByPeriod, calculateGlobalStats } from './utils/statsMath';
import {
  saveDataset,
  getSavedDataset,
  clearSavedDataset,
  getStorageInfo,
} from './utils/dbStorage';

export default function App() {
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [uploadingFileName, setUploadingFileName] = useState<string>('');

  // Initial check for stored dataset in IndexedDB on mount
  useEffect(() => {
    initDataset();
  }, []);

  const initDataset = async () => {
    setIsLoading(true);
    setUploadingFileName('browser_storage');
    setLoadingProgress(20);
    setLoadingStage('Checking IndexedDB storage for saved csTimer data...');
    setErrorMsg(null);

    try {
      const saved = await getSavedDataset();
      if (saved && saved.sessions && saved.sessions.length > 0) {
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
          `Restored ${totalSolvesCount.toLocaleString()} solves across ${saved.sessions.length} sessions from IndexedDB (${saved.fileName})`
        );

        setLoadingProgress(100);
        setLoadingStage('Loaded saved data successfully!');
        await new Promise((res) => setTimeout(res, 120));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to load dataset from IndexedDB:', err);
    }

    // Fall back to sample dataset if nothing was saved
    await loadSampleData();
  };

  const loadSampleData = async () => {
    setIsLoading(true);
    setUploadingFileName('cstimer_demo_350solves.txt');
    setLoadingProgress(15);
    setLoadingStage('Initializing sample csTimer dataset...');
    setErrorMsg(null);
    setSavedNotice(null);

    try {
      await new Promise((res) => setTimeout(res, 120));
      setLoadingProgress(50);
      setLoadingStage('Generating 350 solve logs & session history...');
      const demoSessions = generateSampleData();

      await new Promise((res) => setTimeout(res, 80));
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

      await new Promise((res) => setTimeout(res, 120));
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
        await new Promise((res) => setTimeout(res, 150));

        const content = e.target?.result as string;
        if (!content) throw new Error('File is empty.');

        setLoadingProgress(60);
        setLoadingStage('Parsing solves, timestamps & scrambles...');
        await new Promise((res) => setTimeout(res, 180));

        const parsedSessions = parseCsTimerFile(content);

        setLoadingProgress(80);
        setLoadingStage('Persisting dataset to IndexedDB browser storage...');
        await new Promise((res) => setTimeout(res, 150));

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
          `Saved ${totalSolvesCount.toLocaleString()} solves across ${parsedSessions.length} sessions to browser storage (${file.name})`
        );

        setLoadingProgress(100);
        setLoadingStage('Done!');

        await new Promise((res) => setTimeout(res, 120));
        setIsLoading(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Error parsing csTimer file.');
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

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;
  }, [sessions, selectedSessionId]);

  const periodGroups = useMemo(() => {
    if (!activeSession) return [];
    return groupSolvesByPeriod(activeSession.solves, groupingPeriod, customBatchSize);
  }, [activeSession, groupingPeriod, customBatchSize]);

  const globalStats = useMemo(() => {
    if (!activeSession) return null;
    return calculateGlobalStats(activeSession.solves);
  }, [activeSession]);

  const handleExportCSV = () => {
    if (!periodGroups.length) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Period,Solves,Mean(s),Median(s),Min(s),Max(s),Q1(s),Q3(s),StdDev(s)\n';

    periodGroups.forEach((g) => {
      const row = [
        `"${g.label}"`,
        g.solves.length,
        g.mean,
        g.median,
        g.min,
        g.max,
        g.q1,
        g.q3,
        g.stdDev,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeSession?.name || 'csTimer'}_period_stats.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation Bar */}
      <Navbar
        fileName={fileName}
        onLoadDemo={loadSampleData}
        onReset={handleClearStorage}
        onExportCSV={handleExportCSV}
        isSaved={isSaved}
        storageUsageMB={storageUsageMB}
        onClearStorage={handleClearStorage}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Upload & Session Configuration Panel */}
        <FileUploader
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          groupingPeriod={groupingPeriod}
          onChangeGrouping={handleChangeGrouping}
          customBatchSize={customBatchSize}
          onChangeCustomBatchSize={handleChangeCustomBatchSize}
          onFileUpload={handleFileUpload}
          onLoadDemo={loadSampleData}
          errorMsg={errorMsg}
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          loadingStage={loadingStage}
          uploadingFileName={uploadingFileName}
          isSaved={isSaved}
          storageUsageMB={storageUsageMB}
          savedNotice={savedNotice}
          onClearStorage={handleClearStorage}
        />

        {/* Global Summary Metric Cards */}
        {globalStats && activeSession && (
          <MetricsOverviewCards stats={globalStats} sessionName={activeSession.name} />
        )}

        {/* The 4 Progression Plots */}
        {activeSession && globalStats && (
          <div className="flex flex-col gap-8">
            {/* Plot 1: Overall Progression & Moving Averages */}
            <ProgressionChart
              solves={activeSession.solves}
              periodGroups={periodGroups}
              regression={globalStats.regression}
              groupingPeriod={groupingPeriod}
              title={`${activeSession.name}: Progression Over ${activeSession.solves.length} Solves`}
            />

            {/* Plot 2: Personal Best Progression Over Time */}
            <PbProgressionChart
              solves={activeSession.solves}
              groupingPeriod={groupingPeriod}
              title={`${activeSession.name}: PB Progression Over Time`}
            />

            {/* Plot 3: Solve Time Distribution & Variance */}
            <DailyDistributionBoxPlot
              periodGroups={periodGroups}
              groupingPeriod={groupingPeriod}
            />

            {/* Grid for Plot 3 & Plot 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Plot 3: Distribution Density Shift */}
              <DensityShiftChart
                solves={activeSession.solves}
                groupingPeriod={groupingPeriod}
                title="Time Distribution Shift: Baseline vs. Recent Solves"
              />

              {/* Plot 4: Metrics Summary / Evolution */}
              <MetricsEvolutionChart
                periodGroups={periodGroups}
                groupingPeriod={groupingPeriod}
              />
            </div>

            {/* Detailed Solve Log Table */}
            <SolvesTable solves={activeSession.solves} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-6 text-center text-xs text-stone-500">
        Speedcubing Progression Analyzer &bull; Built with React, Recharts & TypeScript
      </footer>
    </div>
  );
}
