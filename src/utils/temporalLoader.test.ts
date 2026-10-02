import { afterEach, describe, expect, it } from 'vitest';
import { ensureTemporal } from './temporalLoader';

describe('temporalLoader', () => {
  const originalTemporal = globalThis.Temporal;

  afterEach(() => {
    if (originalTemporal) {
      (globalThis as unknown as { Temporal: typeof originalTemporal }).Temporal = originalTemporal;
    }
  });

  it('does nothing when globalThis.Temporal is already available', async () => {
    const sentinel = { isSentinel: true };
    (globalThis as unknown as { Temporal: unknown }).Temporal = sentinel;

    await ensureTemporal();
    expect(globalThis.Temporal).toBe(sentinel);
  });

  it('dynamically polyfills globalThis.Temporal when undefined', async () => {
    delete (globalThis as unknown as { Temporal?: unknown }).Temporal;

    await ensureTemporal();
    expect(globalThis.Temporal).toBeDefined();
    expect(typeof globalThis.Temporal.Now.timeZoneId).toBe('function');
  });
});
