export type PwaInstallAction = 'install' | 'open';

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  canShowButton: boolean;
  actionType: PwaInstallAction;
  actionLabel: string;
  actionTitle: string;
  triggerAction: () => Promise<boolean>;
  promptInstall: () => Promise<boolean>;
  openInApp: () => void;
}

export interface PwaUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  applyUpdateAndReload: () => void;
  dismissUpdate: () => void;
}
