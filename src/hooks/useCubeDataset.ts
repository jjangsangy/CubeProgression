import { useCallback } from 'react';
import { type UseCubeDatasetCoreReturn, useCubeDatasetCore } from './useCubeDatasetCore';
import { useStorageNotice } from './useStorageNotice';

export interface UseCubeDatasetReturn extends UseCubeDatasetCoreReturn {
  // Storage states (composed via useStorageNotice for backwards compatibility)
  isSaved: boolean;
  storageUsageMB: number | undefined;
  savedNotice: string | null;
}

export function useCubeDataset(): UseCubeDatasetReturn {
  const core = useCubeDatasetCore();
  const storage = useStorageNotice();

  const handleClearStorage = useCallback(() => {
    core.handleClearStorage();
    storage.resetStorageState();
  }, [core.handleClearStorage, storage.resetStorageState]);

  return {
    ...core,
    isSaved: storage.isSaved,
    storageUsageMB: storage.storageUsageMB,
    savedNotice: storage.savedNotice,
    handleClearStorage,
  };
}

export { useCubeDatasetCore } from './useCubeDatasetCore';
export {
  DEFAULT_STORAGE_NOTICE_TIMEOUT_MS,
  storageNoticeStore,
  useStorageNotice,
  useStorageStatus,
} from './useStorageNotice';
