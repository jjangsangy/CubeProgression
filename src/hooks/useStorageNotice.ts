import { useSyncExternalStore } from 'react';
import type { StorageNoticeState, StorageStatusState } from '../types';
import { getStorageInfo } from '../utils/dbStorage';

export const DEFAULT_STORAGE_NOTICE_TIMEOUT_MS = 3500;

export interface UseStorageNoticeOptions {
  autoDismissMs?: number;
}

export interface UseStorageNoticeReturn extends StorageNoticeState {
  showNotice: (message: string, timeoutMs?: number) => void;
  clearNotice: () => void;
  setIsSaved: (saved: boolean) => void;
  setStorageUsageMB: (usageMB: number | undefined) => void;
  refreshStorageUsage: () => Promise<number | undefined>;
  notifySaved: (
    solvesCount: number,
    sessionsCount: number,
    fileName: string,
    timeoutMs?: number,
  ) => void;
  notifyRestored: (
    solvesCount: number,
    sessionsCount: number,
    fileName: string,
    timeoutMs?: number,
  ) => void;
  resetStorageNotice: () => void;
  resetStorageState: () => void;
}

class StorageNoticeStore {
  private statusSnapshot: StorageStatusState = {
    isSaved: false,
    storageUsageMB: undefined,
  };

  private noticeSnapshot: StorageNoticeState = {
    isSaved: false,
    storageUsageMB: undefined,
    savedNotice: null,
  };

  private listeners = new Set<() => void>();
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  getStatusSnapshot = (): StorageStatusState => this.statusSnapshot;

  getState = (): StorageNoticeState => this.noticeSnapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.clearDismissTimer();
      }
    };
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  showNotice(notice: string | null, autoDismissMs = DEFAULT_STORAGE_NOTICE_TIMEOUT_MS): void {
    this.clearDismissTimer();
    this.noticeSnapshot = { ...this.noticeSnapshot, savedNotice: notice };
    this.emit();

    if (notice && autoDismissMs > 0 && typeof window !== 'undefined') {
      this.dismissTimer = setTimeout(() => {
        this.noticeSnapshot = { ...this.noticeSnapshot, savedNotice: null };
        this.dismissTimer = null;
        this.emit();
      }, autoDismissMs);
    }
  }

  clearNotice(): void {
    this.clearDismissTimer();
    if (this.noticeSnapshot.savedNotice !== null) {
      this.noticeSnapshot = { ...this.noticeSnapshot, savedNotice: null };
      this.emit();
    }
  }

  setIsSaved(isSaved: boolean): void {
    if (this.statusSnapshot.isSaved !== isSaved) {
      this.statusSnapshot = { ...this.statusSnapshot, isSaved };
      this.noticeSnapshot = { ...this.noticeSnapshot, isSaved };
      this.emit();
    }
  }

  setStorageUsageMB(usageMB: number | undefined): void {
    if (this.statusSnapshot.storageUsageMB !== usageMB) {
      this.statusSnapshot = { ...this.statusSnapshot, storageUsageMB: usageMB };
      this.noticeSnapshot = { ...this.noticeSnapshot, storageUsageMB: usageMB };
      this.emit();
    }
  }

  async refreshStorageUsage(): Promise<number | undefined> {
    try {
      const info = await getStorageInfo();
      if (info !== null) {
        this.setStorageUsageMB(info.usageMB);
        return info.usageMB;
      }
    } catch (err) {
      console.error('Failed to read storage usage:', err);
    }
    return undefined;
  }

  notifySaved(
    solvesCount: number,
    sessionsCount: number,
    fileName: string,
    timeoutMs = DEFAULT_STORAGE_NOTICE_TIMEOUT_MS,
  ): void {
    this.setIsSaved(true);
    this.refreshStorageUsage().catch(() => {});
    const message = `Saved ${solvesCount.toLocaleString()} solves across ${sessionsCount} sessions to browser storage (${fileName})`;
    this.showNotice(message, timeoutMs);
  }

  notifyRestored(
    solvesCount: number,
    sessionsCount: number,
    fileName: string,
    timeoutMs = DEFAULT_STORAGE_NOTICE_TIMEOUT_MS,
  ): void {
    this.setIsSaved(true);
    this.refreshStorageUsage().catch(() => {});
    const message = `Restored ${solvesCount.toLocaleString()} solves across ${sessionsCount} sessions from IndexedDB (${fileName})`;
    this.showNotice(message, timeoutMs);
  }

  reset(): void {
    this.clearDismissTimer();
    this.statusSnapshot = {
      isSaved: false,
      storageUsageMB: undefined,
    };
    this.noticeSnapshot = {
      isSaved: false,
      storageUsageMB: undefined,
      savedNotice: null,
    };
    this.listeners.clear();
  }

  resetStorageNotice(): void {
    this.clearDismissTimer();
    this.statusSnapshot = {
      isSaved: false,
      storageUsageMB: undefined,
    };
    this.noticeSnapshot = {
      isSaved: false,
      storageUsageMB: undefined,
      savedNotice: null,
    };
    this.emit();
  }

  resetStorageState(): void {
    this.resetStorageNotice();
  }
}

export const storageNoticeStore = new StorageNoticeStore();

export function useStorageStatus(): StorageStatusState {
  return useSyncExternalStore(
    storageNoticeStore.subscribe,
    storageNoticeStore.getStatusSnapshot,
    storageNoticeStore.getStatusSnapshot,
  );
}

export function useStorageNotice(options?: UseStorageNoticeOptions): UseStorageNoticeReturn {
  const state = useSyncExternalStore(
    storageNoticeStore.subscribe,
    storageNoticeStore.getState,
    storageNoticeStore.getState,
  );

  return {
    isSaved: state.isSaved,
    storageUsageMB: state.storageUsageMB,
    savedNotice: state.savedNotice,
    showNotice: (message, timeoutMs) =>
      storageNoticeStore.showNotice(message, timeoutMs ?? options?.autoDismissMs),
    clearNotice: () => storageNoticeStore.clearNotice(),
    setIsSaved: (saved) => storageNoticeStore.setIsSaved(saved),
    setStorageUsageMB: (usageMB) => storageNoticeStore.setStorageUsageMB(usageMB),
    refreshStorageUsage: () => storageNoticeStore.refreshStorageUsage(),
    notifySaved: (solvesCount, sessionsCount, fileName, timeoutMs) =>
      storageNoticeStore.notifySaved(
        solvesCount,
        sessionsCount,
        fileName,
        timeoutMs ?? options?.autoDismissMs,
      ),
    notifyRestored: (solvesCount, sessionsCount, fileName, timeoutMs) =>
      storageNoticeStore.notifyRestored(
        solvesCount,
        sessionsCount,
        fileName,
        timeoutMs ?? options?.autoDismissMs,
      ),
    resetStorageNotice: () => storageNoticeStore.resetStorageNotice(),
    resetStorageState: () => storageNoticeStore.resetStorageState(),
  };
}
