import type { TaskName, TaskRegistry, TaskRequest, TaskResponse } from './protocol';
import { runTask } from './tasks';

/**
 * The seam every caller sees: run a registered task and await its clone-safe result.
 * The real implementation is a Worker Pool; when workers are unavailable (Vitest's jsdom,
 * or a degraded browser) it resolves to an in-page adapter that runs the same handler.
 */
export interface TaskDispatcher {
  run<K extends TaskName>(
    task: K,
    payload: TaskRegistry[K]['payload'],
  ): Promise<TaskRegistry[K]['result']>;
  dispose(): void;
}

export type WorkerFactory = () => Worker;

/** Keep the pool small: one parse blocks one worker, and typical sessions have one dataset. */
const MAX_POOL_SIZE = 2;

interface PendingTask {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' });
}

/** Runs tasks on the calling thread. Used when `Worker` is unavailable. */
export function createInPageDispatcher(): TaskDispatcher {
  return {
    run(task, payload) {
      return runTask(task, payload);
    },
    dispose() {
      // In-page execution owns no external resources.
    },
  };
}

function resolvePoolSize(override?: number): number {
  if (override !== undefined) return Math.max(1, Math.min(MAX_POOL_SIZE, override));
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1;
  return Math.max(1, Math.min(MAX_POOL_SIZE, cores));
}

/**
 * A reusable, task-agnostic pool of long-lived module workers. Tasks are handed out
 * round-robin; each response is matched back to its request by `id`.
 */
export function createWorkerPoolDispatcher(
  createWorker: WorkerFactory = defaultWorkerFactory,
  poolSizeOverride?: number,
): TaskDispatcher {
  const poolSize = resolvePoolSize(poolSizeOverride);
  const workers: (Worker | undefined)[] = new Array(poolSize).fill(undefined);
  const pendingByWorker: Map<number, PendingTask>[] = Array.from(
    { length: poolSize },
    () => new Map<number, PendingTask>(),
  );

  let nextTaskId = 1;
  let nextWorkerIndex = 0;
  let disposed = false;

  const getWorker = (index: number): Worker => {
    const existing = workers[index];
    if (existing) return existing;

    const worker = createWorker();
    const pending = pendingByWorker[index];

    worker.onmessage = (event: MessageEvent<TaskResponse>) => {
      const response = event.data;
      const task = pending.get(response.id);
      if (!task) return;
      pending.delete(response.id);
      if (response.ok) task.resolve(response.result);
      else task.reject(new Error(response.error));
    };

    worker.onerror = (event: ErrorEvent) => {
      const error = new Error(event.message || 'Dataset Worker failed.');
      for (const task of pending.values()) task.reject(error);
      pending.clear();
      worker.terminate();
      // Recreate lazily on the next task so a crashed worker does not poison the pool.
      workers[index] = undefined;
    };

    workers[index] = worker;
    return worker;
  };

  return {
    run(task, payload) {
      if (disposed) {
        return Promise.reject(new Error('Worker pool has been disposed.'));
      }

      const index = nextWorkerIndex;
      nextWorkerIndex = (nextWorkerIndex + 1) % poolSize;
      const worker = getWorker(index);
      const pending = pendingByWorker[index];
      const id = nextTaskId++;

      return new Promise<TaskRegistry[typeof task]['result']>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
        const request: TaskRequest = { id, task, payload };
        worker.postMessage(request);
      });
    },

    dispose() {
      disposed = true;
      for (const pending of pendingByWorker) {
        for (const task of pending.values()) {
          task.reject(new Error('Worker pool has been disposed.'));
        }
        pending.clear();
      }
      for (const worker of workers) worker?.terminate();
      workers.fill(undefined);
    },
  };
}

function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined';
}

let sharedDispatcher: TaskDispatcher | null = null;

/** Returns the process-wide Worker Pool, or the in-page adapter when workers are absent. */
export function getWorkerPool(): TaskDispatcher {
  if (!sharedDispatcher) {
    sharedDispatcher = isWorkerAvailable()
      ? createWorkerPoolDispatcher()
      : createInPageDispatcher();
  }
  return sharedDispatcher;
}

/** Tears down the shared pool. Intended for tests. */
export function resetWorkerPoolForTesting(): void {
  sharedDispatcher?.dispose();
  sharedDispatcher = null;
}
