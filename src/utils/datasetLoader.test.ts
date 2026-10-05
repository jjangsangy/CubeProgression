import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../types';
import {
  createDatasetLoader,
  type DatasetLoaderDependencies,
  type DatasetStage,
  DEMO_FILE_NAME,
} from './datasetLoader';
import type { StoredDataset } from './dbStorage';

const sampleSessions: Session[] = [
  {
    id: 'session1',
    name: 'Main',
    solves: [
      {
        id: 1,
        index: 1,
        timeMs: 10000,
        rawTimeSec: 10,
        finalTimeSec: 10,
        penalty: 'OK',
        timestamp: 1600000000000,
        dateStr: '2020-09-13',
      },
    ],
  },
];

function makeDeps(overrides: Partial<DatasetLoaderDependencies> = {}): DatasetLoaderDependencies {
  return {
    dispatchParse: vi.fn().mockResolvedValue(sampleSessions),
    readStored: vi.fn().mockResolvedValue(null),
    persist: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{"session1": []}'),
    generateDemo: vi.fn().mockReturnValue(sampleSessions),
    ...overrides,
  };
}

const storedRecord: StoredDataset = {
  id: 'active_dataset',
  fileName: 'saved.txt',
  sessions: sampleSessions,
  selectedSessionId: 'session1',
  groupingPeriod: 'weekly',
  customBatchSize: 25,
  updatedAt: 0,
};

describe('Dataset Loader', () => {
  describe('loadStored', () => {
    it('returns null when nothing is stored', async () => {
      const loader = createDatasetLoader(makeDeps());

      await expect(loader.loadStored()).resolves.toBeNull();
    });

    it('returns null when the stored record has no sessions', async () => {
      const loader = createDatasetLoader(
        makeDeps({ readStored: vi.fn().mockResolvedValue({ ...storedRecord, sessions: [] }) }),
      );

      await expect(loader.loadStored()).resolves.toBeNull();
    });

    it('maps the stored record and counts its solves', async () => {
      const loader = createDatasetLoader(
        makeDeps({ readStored: vi.fn().mockResolvedValue(storedRecord) }),
      );

      await expect(loader.loadStored()).resolves.toMatchObject({
        fileName: 'saved.txt',
        selectedSessionId: 'session1',
        groupingPeriod: 'weekly',
        customBatchSize: 25,
        totalSolvesCount: 1,
        source: 'storage',
      });
    });
  });

  describe('loadDemo', () => {
    it('persists the demo dataset with defaults and reports each stage', async () => {
      const deps = makeDeps();
      const stages: DatasetStage[] = [];
      const loaded = await createDatasetLoader(deps).loadDemo({
        onStage: (stage) => stages.push(stage),
      });

      expect(loaded.fileName).toBe(DEMO_FILE_NAME);
      expect(loaded.source).toBe('demo');
      expect(loaded.totalSolvesCount).toBe(1);
      expect(deps.persist).toHaveBeenCalledWith(
        expect.objectContaining({ groupingPeriod: 'daily', customBatchSize: 50 }),
      );
      expect(stages).toEqual(['parsing', 'persisting', 'ready']);
    });

    it('passes caller-selected grouping and batch size through to persistence', async () => {
      const deps = makeDeps();

      await createDatasetLoader(deps).loadDemo({ groupingPeriod: 'monthly', customBatchSize: 75 });

      expect(deps.persist).toHaveBeenCalledWith(
        expect.objectContaining({ groupingPeriod: 'monthly', customBatchSize: 75 }),
      );
    });

    it('propagates persistence failures', async () => {
      const deps = makeDeps({ persist: vi.fn().mockRejectedValue(new Error('quota exceeded')) });

      await expect(createDatasetLoader(deps).loadDemo()).rejects.toThrow('quota exceeded');
    });
  });

  describe('loadUploaded', () => {
    it('reads, parses through the dispatcher, and persists an upload', async () => {
      const deps = makeDeps({ readFile: vi.fn().mockResolvedValue('RAW') });
      const stages: DatasetStage[] = [];
      const file = new File(['RAW'], 'my_solves.txt', { type: 'text/plain' });

      const loaded = await createDatasetLoader(deps).loadUploaded(file, {
        groupingPeriod: 'batch50',
        customBatchSize: 50,
        onStage: (stage) => stages.push(stage),
      });

      expect(deps.dispatchParse).toHaveBeenCalledWith('RAW');
      expect(loaded.fileName).toBe('my_solves.txt');
      expect(loaded.source).toBe('upload');
      expect(loaded.totalSolvesCount).toBe(1);
      expect(deps.persist).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'my_solves.txt', groupingPeriod: 'batch50' }),
      );
      expect(stages).toEqual(['reading', 'parsing', 'persisting', 'ready']);
    });

    it('rejects an empty file without dispatching a parse', async () => {
      const deps = makeDeps({ readFile: vi.fn().mockResolvedValue('') });
      const file = new File([''], 'empty.txt', { type: 'text/plain' });

      await expect(createDatasetLoader(deps).loadUploaded(file)).rejects.toThrow('File is empty.');
      expect(deps.dispatchParse).not.toHaveBeenCalled();
    });

    it('propagates read failures', async () => {
      const deps = makeDeps({
        readFile: vi.fn().mockRejectedValue(new Error('Error reading uploaded file.')),
      });
      const file = new File(['x'], 'x.txt', { type: 'text/plain' });

      await expect(createDatasetLoader(deps).loadUploaded(file)).rejects.toThrow(
        'Error reading uploaded file.',
      );
    });
  });
});
