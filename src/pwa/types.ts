export interface PwaConnectivityState {
  isOnline: boolean;
}

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
  openInApp: () => void;
}

export interface PwaUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  applyUpdateAndReload: () => void;
  dismissUpdate: () => void;
}

export interface PwaLifecycle {
  connectivity: PwaConnectivityState;
  install: PwaInstallState;
  update: PwaUpdateState;
}
