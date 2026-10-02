import { lazy, Suspense } from 'react';
import { FileUploader } from './components/FileUploader';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { useCubeDatasetCore } from './hooks/useCubeDatasetCore';

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
    handleExportCSV,
  } = useCubeDatasetCore();

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-stone-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation Bar */}
      <Navbar
        fileName={fileName}
        onLoadDemo={loadSampleData}
        onReset={handleClearStorage}
        onExportCSV={handleExportCSV}
        onClearStorage={handleClearStorage}
      />

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 safe-area-x">
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
          onClearStorage={handleClearStorage}
        />

        {/* Dashboard: Metric Cards, 4 Progression Plots & Solves Table */}
        <Suspense fallback={null}>
          <DashboardView
            session={activeSession}
            stats={globalStats}
            periodGroups={periodGroups}
            groupingPeriod={groupingPeriod}
          />
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
