import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../types';
import { clearSavedDataset, getSavedDataset, getStorageInfo, saveDataset } from './dbStorage';

describe('dbStorage IndexedDB utility', () => {
  const sampleSessions: Session[] = [
    {
      id: 'session1',
      name: 'Main 3x3',
      solves: [
        {
          id: 1,
          index: 1,
          timeMs: 12450,
          rawTimeSec: 12.45,
          finalTimeSec: 12.45,
          penalty: 'OK',
          timestamp: 1690000000000,
          date: new Date(1690000000000),
          dateStr: '2023-07-22',
        },
      ],
    },
  ];

  let originalIndexedDB: IDBFactory | undefined;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalIndexedDB = window.indexedDB;
  });

  afterEach(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: originalIndexedDB,
      configurable: true,
      writable: true,
    });
  });

  function createMockIndexedDB() {
    const store = new Map<string, unknown>();
    const objectStores = new Set<string>();

    const db = {
      objectStoreNames: {
        contains: (name: string) => objectStores.has(name),
      },
      createObjectStore: (name: string) => {
        objectStores.add(name);
        return {};
      },
      transaction: (_storeName: string, _mode: string) => {
        return {
          objectStore: (_name: string) => ({
            put: (record: { id: string }) => {
              const req: {
                onsuccess?: () => void;
                onerror?: (e?: unknown) => void;
                error?: Error;
              } = {};
              setTimeout(() => {
                store.set(record.id, JSON.parse(JSON.stringify(record)));
                req.onsuccess?.();
              }, 0);
              return req;
            },
            get: (key: string) => {
              const req: {
                result?: unknown;
                onsuccess?: () => void;
                onerror?: (e?: unknown) => void;
                error?: Error;
              } = {};
              setTimeout(() => {
                req.result = store.get(key);
                req.onsuccess?.();
              }, 0);
              return req;
            },
            delete: (key: string) => {
              const req: {
                onsuccess?: () => void;
                onerror?: (e?: unknown) => void;
                error?: Error;
              } = {};
              setTimeout(() => {
                store.delete(key);
                req.onsuccess?.();
              }, 0);
              return req;
            },
          }),
        };
      },
    };

    const mockFactory = {
      open: (_dbName: string, _version?: number) => {
        const req: {
          result?: typeof db;
          error?: Error;
          onupgradeneeded?: (ev: { target: { result: typeof db } }) => void;
          onsuccess?: () => void;
          onerror?: () => void;
        } = {};

        setTimeout(() => {
          req.result = db;
          req.onupgradeneeded?.({ target: { result: db } });
          req.onsuccess?.();
        }, 0);

        return req;
      },
    };

    return { mockFactory, store, db };
  }

  it('saves, retrieves, and clears datasets successfully using IndexedDB', async () => {
    const { mockFactory } = createMockIndexedDB();
    Object.defineProperty(window, 'indexedDB', {
      value: mockFactory,
      configurable: true,
      writable: true,
    });

    await saveDataset({
      fileName: 'cstimer_export.txt',
      sessions: sampleSessions,
      selectedSessionId: 'session1',
      groupingPeriod: 'weekly',
      customBatchSize: 25,
    });

    const dataset = await getSavedDataset();
    expect(dataset).not.toBeNull();
    expect(dataset?.fileName).toBe('cstimer_export.txt');
    expect(dataset?.selectedSessionId).toBe('session1');
    expect(dataset?.groupingPeriod).toBe('weekly');
    expect(dataset?.customBatchSize).toBe(25);
    expect(dataset?.sessions.length).toBe(1);
    expect(dataset?.sessions[0].solves[0].date).toBeInstanceOf(Date);

    await clearSavedDataset();
    const afterClear = await getSavedDataset();
    expect(afterClear).toBeNull();
  });

  it('normalizes session dates properly when date is missing or invalid', async () => {
    const { mockFactory, store } = createMockIndexedDB();
    Object.defineProperty(window, 'indexedDB', {
      value: mockFactory,
      configurable: true,
      writable: true,
    });

    // Populate record with solve lacking valid Date
    store.set('active_dataset', {
      id: 'active_dataset',
      fileName: 'test.txt',
      selectedSessionId: 's1',
      sessions: [
        {
          id: 's1',
          name: 'Session',
          solves: [
            {
              id: 1,
              index: 1,
              timeMs: 10000,
              rawTimeSec: 10,
              finalTimeSec: 10,
              penalty: 'OK',
              timestamp: 1680000000000,
              date: null,
            },
            {
              id: 2,
              index: 2,
              timeMs: 12000,
              rawTimeSec: 12,
              finalTimeSec: 12,
              penalty: 'OK',
              dateStr: '2023-05-10',
            },
            {
              id: 3,
              index: 3,
              timeMs: 14000,
              rawTimeSec: 14,
              finalTimeSec: 14,
              penalty: 'OK',
            },
          ],
        },
      ],
      updatedAt: Date.now(),
    });

    const dataset = await getSavedDataset();
    expect(dataset).not.toBeNull();
    expect(dataset?.sessions[0].solves[0].date).toBeInstanceOf(Date);
    expect(dataset?.sessions[0].solves[0].date.getTime()).toBe(1680000000000);
    expect(dataset?.sessions[0].solves[1].date).toBeInstanceOf(Date);
    expect(dataset?.sessions[0].solves[2].date).toBeInstanceOf(Date);
  });

  it('returns null when dataset is not in storage', async () => {
    const { mockFactory } = createMockIndexedDB();
    Object.defineProperty(window, 'indexedDB', {
      value: mockFactory,
      configurable: true,
      writable: true,
    });

    const dataset = await getSavedDataset();
    expect(dataset).toBeNull();
  });

  it('handles IndexedDB not being supported or window undefined gracefully', async () => {
    Object.defineProperty(window, 'indexedDB', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(
      saveDataset({
        fileName: 'test.txt',
        sessions: sampleSessions,
        selectedSessionId: 'session1',
      }),
    ).resolves.toBeUndefined();

    const retrieved = await getSavedDataset();
    expect(retrieved).toBeNull();

    await expect(clearSavedDataset()).resolves.toBeUndefined();
  });

  it('handles IndexedDB open failure gracefully', async () => {
    const errorFactory = {
      open: () => {
        const req: {
          error?: Error;
          onerror?: () => void;
        } = {
          error: new Error('IndexedDB permission denied'),
        };
        setTimeout(() => req.onerror?.(), 0);
        return req;
      },
    };

    Object.defineProperty(window, 'indexedDB', {
      value: errorFactory,
      configurable: true,
      writable: true,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await saveDataset({
      fileName: 'test.txt',
      sessions: sampleSessions,
      selectedSessionId: 'session1',
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving dataset to IndexedDB:',
      expect.any(Error),
    );

    const retrieved = await getSavedDataset();
    expect(retrieved).toBeNull();

    await clearSavedDataset();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error clearing dataset from IndexedDB:',
      expect.any(Error),
    );
  });

  it('handles store transaction errors during save, get, and clear', async () => {
    const dbWithError = {
      objectStoreNames: { contains: () => true },
      transaction: () => ({
        objectStore: () => ({
          put: () => {
            const req: { onerror?: (e?: unknown) => void; error?: Error } = {
              error: new Error('Disk full on put'),
            };
            setTimeout(() => req.onerror?.(), 0);
            return req;
          },
          get: () => {
            const req: { onerror?: (e?: unknown) => void; error?: Error } = {
              error: new Error('Corruption on get'),
            };
            setTimeout(() => req.onerror?.(), 0);
            return req;
          },
          delete: () => {
            const req: { onerror?: (e?: unknown) => void; error?: Error } = {
              error: new Error('Lock error on delete'),
            };
            setTimeout(() => req.onerror?.(), 0);
            return req;
          },
        }),
      }),
    };

    const mockFactory = {
      open: () => {
        const req: { result?: typeof dbWithError; onsuccess?: () => void } = {
          result: dbWithError,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
    };

    Object.defineProperty(window, 'indexedDB', {
      value: mockFactory,
      configurable: true,
      writable: true,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await saveDataset({
      fileName: 'test.txt',
      sessions: sampleSessions,
      selectedSessionId: 'session1',
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving dataset to IndexedDB:',
      expect.any(Error),
    );

    const retrieved = await getSavedDataset();
    expect(retrieved).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error retrieving dataset from IndexedDB:',
      expect.any(Error),
    );

    await clearSavedDataset();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error clearing dataset from IndexedDB:',
      expect.any(Error),
    );
  });

  describe('getStorageInfo', () => {
    it('returns formatted storage info when navigator.storage.estimate is available', async () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({
            usage: 5 * 1024 * 1024,
            quota: 100 * 1024 * 1024,
          }),
        },
        configurable: true,
        writable: true,
      });

      const info = await getStorageInfo();
      expect(info).toEqual({
        usageMB: 5,
        quotaMB: 100,
      });

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
        writable: true,
      });
    });

    it('returns undefined quotaMB when quota is missing from estimate', async () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({
            usage: 2.5 * 1024 * 1024,
          }),
        },
        configurable: true,
        writable: true,
      });

      const info = await getStorageInfo();
      expect(info).toEqual({
        usageMB: 2.5,
        quotaMB: undefined,
      });

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
        writable: true,
      });
    });

    it('returns null when navigator.storage.estimate throws an error', async () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockRejectedValue(new Error('Storage estimate failed')),
        },
        configurable: true,
        writable: true,
      });

      const info = await getStorageInfo();
      expect(info).toBeNull();

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
        writable: true,
      });
    });

    it('returns null when navigator.storage is undefined', async () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const info = await getStorageInfo();
      expect(info).toBeNull();

      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
        writable: true,
      });
    });
  });
});
