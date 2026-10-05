import { RefreshCw, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Footer } from './components/Footer';
import { InstructionModal } from './components/InstructionModal';
import { Navbar } from './components/Navbar';
import { PwaInstallBridge } from './components/PwaInstallBridge';
import { useCubeDatasetCore } from './hooks/useCubeDatasetCore';
import { ThemeProvider } from './theme';
import { registerPwa, skipWaitingAndReload } from './utils/pwaRegister';

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

  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState<boolean>(false);

  useEffect(() => {
    registerPwa({
      onNeedRefresh: (reg) => {
        setUpdateRegistration(reg);
      },
    });
  }, []);

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

        {/* PWA Install Bridge for cross-browser installation support (iOS, Firefox, etc.) */}
        <PwaInstallBridge />

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

        {/* PWA New Version Update Toast */}
        {updateRegistration && (
          <aside
            role="status"
            aria-live="polite"
            aria-label="App update notification"
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-stone-900/95 p-3.5 shadow-2xl backdrop-blur-md text-stone-100"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <RefreshCw
                className={`h-4 w-4 shrink-0 text-amber-400 ${isUpdating ? 'animate-spin' : ''}`}
              />
              <p className="truncate text-xs sm:text-sm text-stone-200">
                A new version of CubeProgression is available.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  setIsUpdating(true);
                  skipWaitingAndReload(updateRegistration);
                }}
                className="inline-flex cursor-pointer items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-stone-950 shadow transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => setUpdateRegistration(null)}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors"
                title="Dismiss update notification"
                aria-label="Dismiss update notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </aside>
        )}
      </div>
    </ThemeProvider>
  );
}
