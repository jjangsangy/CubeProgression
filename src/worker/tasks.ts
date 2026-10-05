import { parseCsTimerFile } from '../utils/csTimerParser';
import { ensureTemporal } from '../utils/temporalLoader';
import type { TaskName, TaskRegistry } from './protocol';

/**
 * The single source of truth for what each task does, shared by the dedicated worker
 * entrypoint and the in-page fallback adapter so both paths execute identical logic.
 */
type TaskHandlerMap = {
  [K in TaskName]: (payload: TaskRegistry[K]['payload']) => Promise<TaskRegistry[K]['result']>;
};

export const taskHandlers: TaskHandlerMap = {
  parse: async ({ content }) => {
    // The worker realm needs its own Temporal; the page's polyfill does not cross the boundary.
    await ensureTemporal();
    return parseCsTimerFile(content);
  },
};

export function runTask<K extends TaskName>(
  task: K,
  payload: TaskRegistry[K]['payload'],
): Promise<TaskRegistry[K]['result']> {
  const handler = taskHandlers[task] as (
    payload: TaskRegistry[K]['payload'],
  ) => Promise<TaskRegistry[K]['result']>;
  return handler(payload);
}
