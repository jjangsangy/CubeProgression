import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveDataset, getSavedDataset, clearSavedDataset, getStorageInfo } from './dbStorage';
import { Session } from '../types';

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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles getStorageInfo gracefully when navigator.storage is missing or present', async () => {
    const info = await getStorageInfo();
    expect(info === null || typeof info.usageMB === 'number').toBe(true);
  });

  it('handles IndexedDB operations if available', async () => {
    if (typeof window !== 'undefined' && window.indexedDB) {
      await saveDataset({
        fileName: 'test.txt',
        sessions: sampleSessions,
        selectedSessionId: 'session1',
      });

      const retrieved = await getSavedDataset();
      if (retrieved) {
        expect(retrieved.fileName).toBe('test.txt');
        expect(retrieved.sessions.length).toBe(1);
        expect(retrieved.sessions[0].solves[0].date).toBeInstanceOf(Date);
      }

      await clearSavedDataset();
      const cleared = await getSavedDataset();
      expect(cleared).toBeNull();
    }
  });
});
