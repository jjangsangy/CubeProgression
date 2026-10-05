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
  promptInstall: () => Promise<boolean>;
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
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const isPromptingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already running in standalone display mode
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent automatic browser mini-infobar prompt
      event.preventDefault();
      cachedPromptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      cachedPromptEvent = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt && !isPromptingRef.current) {
      isPromptingRef.current = true;
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          return true;
        }
      } catch {
        // Fall back to pwa-install component if native prompt fails
      } finally {
        cachedPromptEvent = null;
        setDeferredPrompt(null);
        isPromptingRef.current = false;
      }
    }

    // Bridge the gap for iOS, Firefox, and platforms without native beforeinstallprompt
    if (typeof document !== 'undefined') {
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
  }, [deferredPrompt]);

  return {
    canInstall:
      (deferredPrompt !== null ||
        (typeof document !== 'undefined' && Boolean(document.querySelector('pwa-install')))) &&
      !isInstalled,
    isInstalled,
    promptInstall,
  };
}
