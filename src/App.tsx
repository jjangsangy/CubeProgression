import { lazy, Suspense, useEffect, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Footer } from './components/Footer';
import { InstructionModal } from './components/InstructionModal';
import { Navbar } from './components/Navbar';
import { useCubeDatasetCore } from './hooks/useCubeDatasetCore';
import { PwaLifecycleView } from './pwa';
import { ThemeProvider } from './theme';

const DashboardView = lazy(() => import('./components/DashboardView'));

export default function App() {
  const {
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
  } = useCubeDatasetCore();

  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState<boolean>(false);

  // Handle application shortcut navigation targets (e.g. #progression-chart, #deferred-pb-progression)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (!hash) return;
      try {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      } catch {
        // Ignore malformed hash selectors
      }
    };

    if (!isLoading && activeSession) {
      const timer = setTimeout(handleHashNavigation, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash) return;
      try {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      } catch {
        // Ignore malformed hash selectors
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-stone-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {/* Top Navigation Bar */}
        <Navbar onOpenInstructions={() => setIsInstructionModalOpen(true)} />

        {/* Encapsulated PWA lifecycle view (install bridge + update banner) */}
        <PwaLifecycleView />

        {/* Main Container */}
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 safe-area-x"
        >
          {/* Upload & Session Configuration Panel */}
          <FileUploader
            fileName={fileName}
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
            onClearStorage={handleClearStorage}
            onOpenInstructions={() => setIsInstructionModalOpen(true)}
          />

          {/* Dashboard: Metric Cards, 4 Progression Plots & Solves Table */}
          {!isLoading && activeSession && globalStats && (
            <Suspense
              fallback={
                <div className="flex flex-col gap-8 animate-pulse" id="dashboard-loading-skeleton">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map((id) => (
                      <div
                        key={id}
                        className="h-28 rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                      />
                    ))}
                  </div>
                  <div className="h-[760px] w-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6" />
                </div>
              }
            >
              <DashboardView
                session={activeSession}
                stats={globalStats}
                periodGroups={periodGroups}
                groupingPeriod={groupingPeriod}
              />
            </Suspense>
          )}
        </main>

        {/* Footer */}
        <Footer />

        {/* Instruction Modal */}
        <InstructionModal
          isOpen={isInstructionModalOpen}
          onClose={() => setIsInstructionModalOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
}
