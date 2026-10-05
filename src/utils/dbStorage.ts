import type { GroupingPeriod, Session } from '../types';

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
    request.onerror = () =>
      reject(request.error || new Error('Failed to open IndexedDB database.'));
  });
}

/**
 * Ensures every Solve carries a canonical `dateStr` (YYYY-MM-DD). The parser's
 * local-timezone date string is the source of truth; a missing value is derived
 * from the solve timestamp.
 */
export function normalizeSessionsDates(sessions: Session[]): Session[] {
  if (!Array.isArray(sessions)) return [];
  const tz = Temporal.Now.timeZoneId();
  return sessions.map((session) => ({
    ...session,
    solves: (session.solves || []).map((solve) => {
      let dateStr: string;

      if (typeof solve.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(solve.dateStr)) {
        dateStr = solve.dateStr;
      } else if (typeof solve.timestamp === 'number' && Number.isFinite(solve.timestamp)) {
        dateStr = Temporal.Instant.fromEpochMilliseconds(solve.timestamp)
          .toZonedDateTimeISO(tz)
          .toPlainDate()
          .toString();
      } else {
        dateStr = Temporal.Now.plainDateISO(tz).toString();
      }

      return {
        ...solve,
        dateStr,
      };
    }),
  }));
}

let saveQueue: Promise<void> = Promise.resolve();

/**
 * Saves the active csTimer dataset to IndexedDB
 */
export function saveDataset(data: {
  fileName: string;
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
}): Promise<void> {
  const op = saveQueue.then(async () => {
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
        updatedAt: Temporal.Now.instant().epochMilliseconds,
      };

      await new Promise<void>((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => {
          if (tx && 'oncomplete' in tx && typeof tx.addEventListener === 'function') {
            tx.addEventListener('complete', () => resolve(), { once: true });
            tx.addEventListener('error', () => reject(tx.error), { once: true });
            tx.addEventListener('abort', () => reject(tx.error), { once: true });
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Error saving dataset to IndexedDB:', err);
    }
  });

  saveQueue = op.catch(() => {});
  return op;
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

    // Restore Temporal.PlainDate objects inside sessions
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
      return {
        usageMB: Number(usageMB.toFixed(2)),
        quotaMB: quotaMB ? Number(quotaMB.toFixed(0)) : undefined,
      };
    } catch {
      return null;
    }
  }
  return null;
}
