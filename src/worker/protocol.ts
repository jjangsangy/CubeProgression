import type { Session } from '../types';

/**
 * The registry of tasks the Worker Pool can run. Each entry declares the payload it
 * accepts and the clone-safe result it returns. Add a task by extending this interface
 * and registering a matching handler in `tasks.ts`.
 */
export interface TaskRegistry {
  parse: {
    payload: { content: string };
    result: Session[];
  };
}

export type TaskName = keyof TaskRegistry;

/** A unit of work posted from the page to a worker. */
export interface TaskRequest<K extends TaskName = TaskName> {
  id: number;
  task: K;
  payload: TaskRegistry[K]['payload'];
}

/** A successful result posted back from the worker, matched by `id`. */
export interface TaskSuccess<K extends TaskName = TaskName> {
  id: number;
  ok: true;
  result: TaskRegistry[K]['result'];
}

/** A failed task. Errors cross the worker boundary as a serialized message. */
export interface TaskFailure {
  id: number;
  ok: false;
  error: string;
}

export type TaskResponse<K extends TaskName = TaskName> = TaskSuccess<K> | TaskFailure;
