import { RefreshCw, X } from 'lucide-react';
import type React from 'react';
import { PwaInstallBridge } from './PwaInstallBridge';
import type { PwaUpdateState } from './types';
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate';

export interface PwaLifecycleViewProps {
  manifestUrl?: string;
  name?: string;
  description?: string;
  icon?: string;
  updateOverride?: PwaUpdateState;
}

interface PwaUpdateToastProps {
  update: PwaUpdateState;
}

const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({ update }) => {
  if (!update.isUpdateAvailable) return null;

  return (
    <aside
      id="pwa-update-toast"
      role="status"
      aria-live="polite"
      aria-label="App update notification"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-stone-900/95 p-3.5 shadow-2xl backdrop-blur-md text-stone-100"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw
          className={`h-4 w-4 shrink-0 text-amber-400 ${update.isUpdating ? 'animate-spin' : ''}`}
        />
        <p className="truncate text-xs sm:text-sm text-stone-200">
          A new version of CubeProgression is available.
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id="pwa-update-reload-btn"
          type="button"
          disabled={update.isUpdating}
          onClick={update.applyUpdateAndReload}
          className="inline-flex cursor-pointer items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-stone-950 shadow transition-all hover:from-amber-400 hover:to-orange-400 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update
        </button>
        <button
          id="pwa-update-dismiss-btn"
          type="button"
          onClick={update.dismissUpdate}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors"
          title="Dismiss update notification"
          aria-label="Dismiss update notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

const PwaUpdateToastContainer: React.FC = () => {
  return <PwaUpdateToast update={useServiceWorkerUpdate()} />;
};

export const PwaLifecycleView: React.FC<PwaLifecycleViewProps> = ({
  manifestUrl,
  name,
  description,
  icon,
  updateOverride,
}) => {
  return (
    <>
      {/* PWA Install Bridge for cross-browser installation support (iOS, Firefox, etc.) */}
      <PwaInstallBridge
        manifestUrl={manifestUrl}
        name={name}
        description={description}
        icon={icon}
      />

      {/* PWA New Version Update Toast */}
      {updateOverride ? <PwaUpdateToast update={updateOverride} /> : <PwaUpdateToastContainer />}
    </>
  );
};
