import { useCallback, useEffect, useState } from 'react';
import type { PwaUpdateState } from './types';

// --- Service Worker registration & lifecycle (module-scoped, one per page session) ---

let isReloading = false;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function registerServiceWorker(
  onNeedRefresh: (registration: ServiceWorkerRegistration) => void,
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  // Only activate the Service Worker in production builds to avoid caching issues during Vite HMR development
  if (!import.meta.env.PROD) {
    // If a Service Worker was previously registered on this port, unregister it in dev
    if (import.meta.env.DEV) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch {
        // Ignore unregistration errors in dev
      }
    }
    return null;
  }

  try {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env.BASE_URL,
    });

    // Check if an update is already waiting
    if (registration.waiting) {
      onNeedRefresh(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available and waiting for skipWaiting
            onNeedRefresh(registration);
          }
        }
      });
    });

    // Check for updates when the user returns to the tab
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    }

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

function skipWaitingAndReload(registration: ServiceWorkerRegistration): void {
  if (registration.waiting && !isReloading) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (!isReloading) {
          isReloading = true;
          window.location.reload();
        }
      },
      { once: true },
    );
  }
}

export { registerServiceWorker, skipWaitingAndReload };

/** Shared registration promise so every caller within a page session sees the same active update. */
let activeUpdateRegistration: ServiceWorkerRegistration | null = null;
const updateListeners = new Set<(reg: ServiceWorkerRegistration | null) => void>();

function setGlobalUpdateRegistration(reg: ServiceWorkerRegistration | null): void {
  activeUpdateRegistration = reg;
  for (const listener of updateListeners) {
    listener(reg);
  }
}

export function resetServiceWorkerUpdateForTesting(): void {
  isReloading = false;
  registrationPromise = null;
  activeUpdateRegistration = null;
  updateListeners.clear();
}

/**
 * Service Worker Lifecycle Module
 *
 * Encapsulates background Service Worker registration, update readiness detection
 * (`waiting` phase), and the atomic skip-waiting page reload. Registering the worker
 * and receiving its update readiness are one concern; this module owns both, so no
 * external utility is needed to ferry the registration across a seam.
 */
export function useServiceWorkerUpdate(): PwaUpdateState {
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(
    () => activeUpdateRegistration,
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const listener = (reg: ServiceWorkerRegistration | null) => {
      setUpdateRegistration(reg);
    };
    updateListeners.add(listener);
    return () => {
      updateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (registrationPromise) return;
    registrationPromise = registerServiceWorker((reg) => {
      setGlobalUpdateRegistration(reg);
    }).catch(() => null);
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

  return {
    isUpdateAvailable: Boolean(updateRegistration),
    isUpdating,
    applyUpdateAndReload,
    dismissUpdate,
  };
}
