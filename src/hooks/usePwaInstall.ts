import type { PwaInstallState } from '../pwa/types';
import { isBridgePlatform, isFirefoxPlatform, usePwa } from '../pwa/usePwa';

export type { PwaInstallState };
export { isBridgePlatform, isFirefoxPlatform };

/**
 * Backwards-compatible adapter delegating to the unified PWA lifecycle module.
 */
export function usePwaInstall(): PwaInstallState {
  const pwa = usePwa();
  return pwa.install;
}
