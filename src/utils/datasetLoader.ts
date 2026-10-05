import type { GroupingPeriod, Session } from '../types';
import { getWorkerPool } from '../worker/workerPool';
import { getSavedDataset, type StoredDataset, saveDataset } from './dbStorage';
import { generateSampleData } from './sampleData';

/** Where a loaded dataset came from. */
export type DatasetSource = 'storage' | 'demo' | 'upload';

/** The stage-based progress the loading UI reports: reading → parsing → persisting → ready. */
export type DatasetStage = 'reading' | 'parsing' | 'persisting' | 'ready';

export const DEMO_FILE_NAME = 'cstimer_demo_350solves.txt';

export interface LoadedDataset {
  sessions: Session[];
  fileName: string;
  selectedSessionId: string;
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
  totalSolvesCount: number;
  source: DatasetSource;
}

export interface DatasetLoadOptions {
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
  onStage?: (stage: DatasetStage) => void;
}

/**
 * Turns a dataset source into a ready-to-render session: reads bytes, dispatches the
 * parse to the Dataset Worker, and persists through the Dataset Store. It owns no React
 * state — the caller drives the loading UI from the stage callback.
 */
export interface DatasetLoader {
  loadStored(): Promise<LoadedDataset | null>;
  loadDemo(options?: DatasetLoadOptions): Promise<LoadedDataset>;
  loadUploaded(file: File, options?: DatasetLoadOptions): Promise<LoadedDataset>;
}

export interface DatasetLoaderDependencies {
  dispatchParse: (content: string) => Promise<Session[]>;
  readStored: () => Promise<StoredDataset | null>;
  persist: (dataset: {
    fileName: string;
    sessions: Session[];
    selectedSessionId: string;
    groupingPeriod?: GroupingPeriod;
    customBatchSize?: number;
  }) => Promise<void>;
  readFile: (file: File) => Promise<string>;
  generateDemo: () => Session[];
}

function countSolves(sessions: Session[]): number {
  return sessions.reduce((total, session) => total + session.solves.length, 0);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Error reading uploaded file.'));
    reader.readAsText(file);
  });
}

const defaultDependencies: DatasetLoaderDependencies = {
  dispatchParse: (content) => getWorkerPool().run('parse', { content }),
  readStored: () => getSavedDataset(),
  persist: (dataset) => saveDataset(dataset),
  readFile: readFileAsText,
  generateDemo: () => generateSampleData(),
};

export function createDatasetLoader(
  overrides: Partial<DatasetLoaderDependencies> = {},
): DatasetLoader {
  const deps: DatasetLoaderDependencies = { ...defaultDependencies, ...overrides };

  return {
    async loadStored() {
      const stored = await deps.readStored();
      if (!stored?.sessions || stored.sessions.length === 0) return null;

      return {
        sessions: stored.sessions,
        fileName: stored.fileName || 'cstimer_saved.txt',
        selectedSessionId: stored.selectedSessionId || stored.sessions[0].id,
        groupingPeriod: stored.groupingPeriod,
        customBatchSize: stored.customBatchSize,
        totalSolvesCount: countSolves(stored.sessions),
        source: 'storage',
      };
    },

    async loadDemo(options: DatasetLoadOptions = {}) {
      options.onStage?.('parsing');
      const sessions = deps.generateDemo();
      const selectedSessionId = sessions[0].id;
      const dataset = {
        fileName: DEMO_FILE_NAME,
        sessions,
        selectedSessionId,
        groupingPeriod: options.groupingPeriod ?? 'daily',
        customBatchSize: options.customBatchSize ?? 50,
      };

      options.onStage?.('persisting');
      await deps.persist(dataset);
      options.onStage?.('ready');

      return { ...dataset, totalSolvesCount: countSolves(sessions), source: 'demo' as const };
    },

    async loadUploaded(file: File, options: DatasetLoadOptions = {}) {
      options.onStage?.('reading');
      const content = await deps.readFile(file);
      if (!content) throw new Error('File is empty.');

      options.onStage?.('parsing');
      const sessions = await deps.dispatchParse(content);
      const selectedSessionId = sessions[0].id;
      const dataset = {
        fileName: file.name,
        sessions,
        selectedSessionId,
        groupingPeriod: options.groupingPeriod,
        customBatchSize: options.customBatchSize,
      };

      options.onStage?.('persisting');
      await deps.persist(dataset);
      options.onStage?.('ready');

      return { ...dataset, totalSolvesCount: countSolves(sessions), source: 'upload' as const };
    },
  };
}

/** Page-wide Dataset Loader backed by the real Worker Pool and Dataset Store. */
export const datasetLoader = createDatasetLoader();
