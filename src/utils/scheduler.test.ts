import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { yieldToMain } from './scheduler';

describe('scheduler utility', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('yields via scheduler.yield when available', async () => {
    const mockYield = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { scheduler: { yield: () => Promise<void> } }).scheduler = {
      yield: mockYield,
    };

    await yieldToMain();
    expect(mockYield).toHaveBeenCalledTimes(1);

    delete (window as unknown as { scheduler?: unknown }).scheduler;
  });

  it('falls back to setTimeout when scheduler is unavailable', async () => {
    delete (window as unknown as { scheduler?: unknown }).scheduler;

    const promise = yieldToMain();
    expect(promise).toBeInstanceOf(Promise);
    await promise;
  });
});
