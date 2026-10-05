import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
  openInApp: () => void;
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

  // Firefox (Desktop & Mobile)
  const isFirefox = /Firefox|FxiOS/i.test(ua);

  // Allow in test environment (JSDOM) for testing bridge delegation
  const isTestEnv = /jsdom/i.test(ua);

  return isAppleMobile || isAppleDesktop || isFirefox || isTestEnv;
}

// Module-level cache to capture early beforeinstallprompt event before React hydration
let cachedPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    cachedPromptEvent = event as BeforeInstallPromptEvent;
  });
}

export function usePwaInstall(): PwaInstallState {
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
    // If beforeinstallprompt already fired early, app is not installed
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already running in standalone display mode
    const standaloneMode =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    if (standaloneMode) {
      setIsStandalone(true);
      setIsInstalled(true);
    }

    // Check navigator.getInstalledRelatedApps() for installed PWA detection in Chromium
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

    // Listen for standalone display-mode changes
    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    standaloneMedia?.addEventListener?.('change', handleMediaChange);

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent automatic browser mini-infobar prompt
      event.preventDefault();
      cachedPromptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // App is definitely not installed if beforeinstallprompt fired
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
    // If the app is already installed, do not trigger any prompts
    if (isInstalled) return false;

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

    // Bridge the gap only for iOS, Safari, and Firefox (platforms without native beforeinstallprompt)
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

  return {
    canInstall:
      !isInstalled &&
      (deferredPrompt !== null ||
        (isBridgePlatform() &&
          typeof document !== 'undefined' &&
          Boolean(document.querySelector('pwa-install')))),
    isInstalled,
    isStandalone,
    promptInstall,
    openInApp,
  };
}
