import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TaskRequest } from './protocol';
import {
  createInPageDispatcher,
  createWorkerPoolDispatcher,
  getWorkerPool,
  resetWorkerPoolForTesting,
} from './workerPool';

const validExport = JSON.stringify({
  session1: [[[0, 12000], "R U R'", '', 1600000000]],
});

/** Captures posted requests and lets a test play back worker responses. */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly posted: TaskRequest[] = [];

  postMessage(message: TaskRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  respondLatest(result: unknown): void {
    const request = this.posted[this.posted.length - 1];
    this.onmessage?.({ data: { id: request.id, ok: true, result } } as MessageEvent);
  }

  rejectLatest(error: string): void {
    const request = this.posted[this.posted.length - 1];
    this.onmessage?.({ data: { id: request.id, ok: false, error } } as MessageEvent);
  }

  crash(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

const asWorker = (fake: FakeWorker): Worker => fake as unknown as Worker;

afterEach(() => {
  resetWorkerPoolForTesting();
  vi.unstubAllGlobals();
});

describe('Worker Pool', () => {
  it('dispatches a task to a worker and resolves the matching response', async () => {
    const fake = new FakeWorker();
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(fake), 1);

    const result = dispatcher.run('parse', { content: 'abc' });

    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]).toMatchObject({ task: 'parse', payload: { content: 'abc' } });

    fake.respondLatest([{ id: 'session1', name: 'Main', solves: [] }]);
    await expect(result).resolves.toEqual([{ id: 'session1', name: 'Main', solves: [] }]);
  });

  it('rejects with the worker-reported error', async () => {
    const fake = new FakeWorker();
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(fake), 1);

    const result = dispatcher.run('parse', { content: 'bad' });
    fake.rejectLatest('Invalid csTimer file format.');

    await expect(result).rejects.toThrow('Invalid csTimer file format.');
  });

  it('round-robins across pooled workers and correlates responses by id', async () => {
    const first = new FakeWorker();
    const second = new FakeWorker();
    const created = [first, second];
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(created.shift() as FakeWorker), 2);

    const firstResult = dispatcher.run('parse', { content: 'one' });
    const secondResult = dispatcher.run('parse', { content: 'two' });

    expect(first.posted).toHaveLength(1);
    expect(second.posted).toHaveLength(1);

    // Resolve out of order to prove correlation is by id, not arrival order.
    second.respondLatest('second-result');
    first.respondLatest('first-result');

    await expect(firstResult).resolves.toBe('first-result');
    await expect(secondResult).resolves.toBe('second-result');
  });

  it('rejects pending tasks and recreates the worker after a worker error', async () => {
    const first = new FakeWorker();
    const second = new FakeWorker();
    const created = [first, second];
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(created.shift() as FakeWorker), 1);

    const pending = dispatcher.run('parse', { content: 'boom' });
    first.crash('worker exploded');

    await expect(pending).rejects.toThrow('worker exploded');
    expect(first.terminated).toBe(true);

    const retry = dispatcher.run('parse', { content: 'again' });
    expect(second.posted).toHaveLength(1);
    second.respondLatest('recovered');

    await expect(retry).resolves.toBe('recovered');
  });

  it('rejects in-flight tasks and terminates workers on dispose', async () => {
    const fake = new FakeWorker();
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(fake), 1);

    const pending = dispatcher.run('parse', { content: 'x' });
    dispatcher.dispose();

    await expect(pending).rejects.toThrow(/disposed/);
    expect(fake.terminated).toBe(true);
  });

  it('rejects new tasks after dispose', async () => {
    const fake = new FakeWorker();
    const dispatcher = createWorkerPoolDispatcher(() => asWorker(fake), 1);
    dispatcher.dispose();

    await expect(dispatcher.run('parse', { content: 'x' })).rejects.toThrow(/disposed/);
  });
});

describe('in-page dispatcher', () => {
  it('runs tasks synchronously when no worker is available', async () => {
    const sessions = await createInPageDispatcher().run('parse', { content: validExport });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].solves).toHaveLength(1);
  });
});

describe('shared Worker Pool factory', () => {
  it('falls back to a cached in-page dispatcher when Worker is undefined', async () => {
    vi.stubGlobal('Worker', undefined);

    const pool = getWorkerPool();

    expect(getWorkerPool()).toBe(pool);
    const sessions = await pool.run('parse', { content: validExport });
    expect(sessions).toHaveLength(1);
  });

  it('rebuilds the shared pool after a test reset', () => {
    vi.stubGlobal('Worker', undefined);

    const first = getWorkerPool();
    resetWorkerPoolForTesting();

    expect(getWorkerPool()).not.toBe(first);
  });
});
