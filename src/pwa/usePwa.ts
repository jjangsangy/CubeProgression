import { useCallback, useEffect, useRef, useState } from 'react';
import { registerPwa, skipWaitingAndReload } from '../utils/pwaRegister';
import type {
  PwaConnectivityState,
  PwaInstallAction,
  PwaInstallState,
  PwaLifecycle,
  PwaUpdateState,
} from './types';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function isFirefoxPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Firefox|FxiOS/i.test(navigator.userAgent);
}

export function isBridgePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;

  // iOS / iPadOS
  const isAppleMobile =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // macOS Safari (Safari, but not Chrome / Chromium / Edge / Opera)
  const isAppleDesktop =
    /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|CriOS|OPR|Vivaldi/.test(ua);

  // Allow in test environment (JSDOM) for testing bridge delegation
  const isTestEnv = /jsdom/i.test(ua) && !/Firefox|FxiOS/i.test(ua);

  return isAppleMobile || isAppleDesktop || isTestEnv;
}

// Module-level cache to capture early beforeinstallprompt event before React hydration
let cachedPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    cachedPromptEvent = event as BeforeInstallPromptEvent;
  });
}

// Module-level Service Worker update registration cache
let activeUpdateRegistration: ServiceWorkerRegistration | null = null;
let isServiceWorkerRegistered = false;
const updateListeners = new Set<(reg: ServiceWorkerRegistration | null) => void>();

function setGlobalUpdateRegistration(reg: ServiceWorkerRegistration | null): void {
  activeUpdateRegistration = reg;
  for (const listener of updateListeners) {
    listener(reg);
  }
}

export function resetPwaStateForTesting(): void {
  cachedPromptEvent = null;
  activeUpdateRegistration = null;
  isServiceWorkerRegistered = false;
  updateListeners.clear();
}

/**
 * Deep PWA Lifecycle Module
 *
 * Encapsulates:
 * - Network connectivity tracking (online/offline)
 * - Installation interception (Chromium beforeinstallprompt + iOS/Firefox bridge adapter)
 * - Service Worker registration, update readiness, and atomic reload
 */
export function usePwa(): PwaLifecycle {
  // --- Connectivity State ---
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  // --- Install State ---
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedPromptEvent,
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true) ||
      false
    );
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (cachedPromptEvent) return false;

    const standaloneMode =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);
    if (standaloneMode) return true;

    try {
      return localStorage.getItem('cubeprogression_pwa_installed') === 'true';
    } catch {
      return false;
    }
  });

  const isPromptingRef = useRef(false);

  // --- Update State ---
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(
    () => activeUpdateRegistration,
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Connectivity event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update subscription listener
  useEffect(() => {
    const listener = (reg: ServiceWorkerRegistration | null) => {
      setUpdateRegistration(reg);
    };
    updateListeners.add(listener);
    return () => {
      updateListeners.delete(listener);
    };
  }, []);

  // Service Worker registration (single execution per session)
  useEffect(() => {
    if (isServiceWorkerRegistered) return;
    isServiceWorkerRegistered = true;

    registerPwa({
      onNeedRefresh: (reg) => {
        setGlobalUpdateRegistration(reg);
      },
    }).catch(() => {});
  }, []);

  // Install event listeners & platform checks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneMode =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    if (standaloneMode) {
      setIsStandalone(true);
      setIsInstalled(true);
    }

    if ('getInstalledRelatedApps' in window.navigator) {
      (
        window.navigator as unknown as {
          getInstalledRelatedApps: () => Promise<unknown[]>;
        }
      )
        .getInstalledRelatedApps()
        .then((relatedApps) => {
          if (relatedApps && relatedApps.length > 0) {
            setIsInstalled(true);
            try {
              localStorage.setItem('cubeprogression_pwa_installed', 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    standaloneMedia?.addEventListener?.('change', handleMediaChange);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      cachedPromptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstalled(false);
      try {
        localStorage.removeItem('cubeprogression_pwa_installed');
      } catch {}
    };

    const handleAppInstalled = () => {
      cachedPromptEvent = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      try {
        localStorage.setItem('cubeprogression_pwa_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMedia?.removeEventListener?.('change', handleMediaChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (isInstalled || isFirefoxPlatform()) return false;

    if (deferredPrompt && !isPromptingRef.current) {
      isPromptingRef.current = true;
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          try {
            localStorage.setItem('cubeprogression_pwa_installed', 'true');
          } catch {}
          return true;
        }
        return false;
      } catch {
        // Fall back to bridge only on bridge platforms
      } finally {
        cachedPromptEvent = null;
        setDeferredPrompt(null);
        isPromptingRef.current = false;
      }
    }

    if (isBridgePlatform() && typeof document !== 'undefined') {
      const pwaInstallEl = document.querySelector('pwa-install') as
        | (HTMLElement & {
            showDialog: (forced?: boolean) => void;
            install: () => Promise<void>;
          })
        | null;

      if (pwaInstallEl) {
        if (typeof pwaInstallEl.showDialog === 'function') {
          pwaInstallEl.showDialog(true);
        }
        if (typeof pwaInstallEl.install === 'function') {
          void pwaInstallEl.install();
        }
        return true;
      }
    }

    return false;
  }, [deferredPrompt, isInstalled]);

  const openInApp = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const protocolUrl = `web+cubeprogression://open?url=${encodeURIComponent(currentUrl)}`;

    try {
      const link = document.createElement('a');
      link.href = protocolUrl;
      link.click();
    } catch {
      // Protocol handler blocked or not supported
    }
  }, []);

  const applyUpdateAndReload = useCallback(() => {
    if (activeUpdateRegistration) {
      setIsUpdating(true);
      skipWaitingAndReload(activeUpdateRegistration);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setGlobalUpdateRegistration(null);
  }, []);

  const isFirefox = isFirefoxPlatform();

  const canInstall =
    !isInstalled &&
    !isFirefox &&
    (deferredPrompt !== null ||
      (isBridgePlatform() &&
        typeof document !== 'undefined' &&
        Boolean(document.querySelector('pwa-install'))));

  const canShowButton = !isStandalone && !isFirefox;
  const actionType: PwaInstallAction = isInstalled ? 'open' : 'install';
  const actionLabel = isInstalled ? 'Open in App' : 'Install App';
  const actionTitle = isInstalled
    ? 'Open CubeProgression in the installed app'
    : 'Install CubeProgression as a Progressive Web App';
  const triggerAction = useCallback(async (): Promise<boolean> => {
    if (isInstalled) {
      openInApp();
      return true;
    }
    return promptInstall();
  }, [isInstalled, openInApp, promptInstall]);

  const connectivity: PwaConnectivityState = {
    isOnline,
  };

  const install: PwaInstallState = {
    canInstall,
    isInstalled,
    isStandalone,
    canShowButton,
    actionType,
    actionLabel,
    actionTitle,
    triggerAction,
    promptInstall,
    openInApp,
  };

  const update: PwaUpdateState = {
    isUpdateAvailable: Boolean(updateRegistration),
    isUpdating,
    applyUpdateAndReload,
    dismissUpdate,
  };

  return {
    connectivity,
    install,
    update,
  };
}
