import type { TaskRequest, TaskResponse } from './protocol';
import { runTask } from './tasks';

/**
 * Minimal shape of the dedicated worker global. `lib.dom` types `self` as `Window`, whose
 * `postMessage` requires a `targetOrigin`, so we narrow it to the worker surface we use.
 */
interface DatasetWorkerScope {
  onmessage: ((event: MessageEvent<TaskRequest>) => void) | null;
  postMessage(message: TaskResponse): void;
}

const scope = self as unknown as DatasetWorkerScope;

scope.onmessage = async (event) => {
  const { id, task, payload } = event.data;

  try {
    const result = await runTask(task, payload);
    scope.postMessage({ id, ok: true, result });
  } catch (err) {
    scope.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
