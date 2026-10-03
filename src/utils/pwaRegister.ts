export interface PwaRegisterOptions {
  onNeedRefresh?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

let isReloading = false;

/**
 * Registers the Service Worker in production environments, managing
 * update detection and offline readiness callbacks.
 */
export async function registerPwa(
  options: PwaRegisterOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  // Only activate service worker in production builds to avoid caching issues during Vite HMR development
  if (!import.meta.env.PROD) {
    // If a service worker was previously registered on this port, unregister it in dev
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
      options.onNeedRefresh?.(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available and waiting for skipWaiting
            options.onNeedRefresh?.(registration);
          } else {
            // Content is cached for offline use
            options.onOfflineReady?.();
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

/**
 * Activates the waiting service worker and triggers a page reload.
 */
export function skipWaitingAndReload(registration: ServiceWorkerRegistration): void {
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
