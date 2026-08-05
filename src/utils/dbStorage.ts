import { Session, GroupingPeriod } from '../types';

const DB_NAME = 'CubeProgressionDB';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';
const ACTIVE_KEY = 'active_dataset';

export interface StoredDataset {
  id: string;
  fileName: string;
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
  updatedAt: number;
}

export interface StorageEstimateInfo {
  usageMB: number;
  quotaMB?: number;
}

/**
 * Initializes and returns the IndexedDB database connection
 */
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB database.'));
  });
}

/**
 * Ensures that all Solve objects in sessions have proper Date objects for `date`
 */
function normalizeSessionsDates(sessions: Session[]): Session[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.map((session) => ({
    ...session,
    solves: (session.solves || []).map((solve) => {
      let d = solve.date;
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        d = new Date(solve.timestamp || solve.dateStr || Date.now());
      }
      return {
        ...solve,
        date: d,
      };
    }),
  }));
}

/**
 * Saves the active csTimer dataset to IndexedDB
 */
export async function saveDataset(data: {
  fileName: string;
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
}): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredDataset = {
      id: ACTIVE_KEY,
      fileName: data.fileName,
      sessions: data.sessions,
      selectedSessionId: data.selectedSessionId,
      groupingPeriod: data.groupingPeriod,
      customBatchSize: data.customBatchSize,
      updatedAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving dataset to IndexedDB:', err);
  }
}

/**
 * Retrieves the saved csTimer dataset from IndexedDB, if it exists
 */
export async function getSavedDataset(): Promise<StoredDataset | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const record = await new Promise<StoredDataset | null>((resolve, reject) => {
      const req = store.get(ACTIVE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    // Restore Date objects inside sessions
    record.sessions = normalizeSessionsDates(record.sessions);
    return record;
  } catch (err) {
    console.error('Error retrieving dataset from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears saved dataset from IndexedDB
 */
export async function clearSavedDataset(): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(ACTIVE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error clearing dataset from IndexedDB:', err);
  }
}

/**
 * Gets storage estimate usage in MB
 */
export async function getStorageInfo(): Promise<StorageEstimateInfo | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaMB = estimate.quota ? estimate.quota / (1024 * 1024) : undefined;
      return { usageMB: Number(usageMB.toFixed(2)), quotaMB: quotaMB ? Number(quotaMB.toFixed(0)) : undefined };
    } catch {
      return null;
    }
  }
  return null;
}
