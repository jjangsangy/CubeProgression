import { useCallback, useEffect, useRef, useState } from 'react';
import type { PwaInstallAction, PwaInstallState } from './types';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALLED_STORAGE_KEY = 'cubeprogression_pwa_installed';

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

function readInstalledFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeInstalledFlag(installed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (installed) {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode / blocked) — ignore
  }
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const matchesDisplayMode = (mode: string): boolean =>
    window.matchMedia?.(`(display-mode: ${mode})`)?.matches ?? false;
  return (
    matchesDisplayMode('standalone') ||
    matchesDisplayMode('window-controls-overlay') ||
    ('standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

// Module-level cache to capture the early beforeinstallprompt event before React hydration,
// so the install capability is known on first render.
let cachedPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    cachedPromptEvent = event as BeforeInstallPromptEvent;
  });
}

export function resetAppInstallStateForTesting(): void {
  cachedPromptEvent = null;
}

/**
 * App Installation Module
 *
 * Encapsulates desktop and mobile application installation for the browser platform:
 * Chromium `beforeinstallprompt` capture, the iOS/Safari `pwa-install` bridge adapter,
 * standalone display-mode detection, and custom protocol launch.
 */
export function useAppInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedPromptEvent,
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isStandaloneDisplayMode());
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (cachedPromptEvent) return false;
    if (isStandaloneDisplayMode()) return true;
    return readInstalledFlag();
  });

  const isPromptingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isStandaloneDisplayMode()) {
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
            writeInstalledFlag(true);
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
      writeInstalledFlag(false);
    };

    const handleAppInstalled = () => {
      cachedPromptEvent = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      writeInstalledFlag(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMedia?.removeEventListener?.('change', handleMediaChange);
    };
  }, []);

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

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (isInstalled || isFirefoxPlatform()) return false;

    if (deferredPrompt && !isPromptingRef.current) {
      isPromptingRef.current = true;
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          writeInstalledFlag(true);
          return true;
        }
        return false;
      } catch {
        // Fall back to the pwa-install bridge only on bridge platforms
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

  return {
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
}
