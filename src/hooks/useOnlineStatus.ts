import { usePwa } from '../pwa/usePwa';

/**
 * Tracks online/offline connectivity status with safe SSR/jsdom fallback.
 *
 * Backwards-compatible adapter delegating to the unified PWA lifecycle module.
 */
export function useOnlineStatus(): boolean {
  const pwa = usePwa();
  return pwa.connectivity.isOnline;
}
