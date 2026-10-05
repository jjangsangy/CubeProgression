import { describe, expect, it } from 'vitest';
import { runTask } from './tasks';

const validExport = JSON.stringify({
  session1: [
    [[0, 12000], "R U R'", '', 1600000000],
    [[2000, 11000], "U R U'", '', 1600000060],
  ],
});

describe('worker tasks', () => {
  it('parses csTimer content into sessions', async () => {
    const sessions = await runTask('parse', { content: validExport });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].solves).toHaveLength(2);
    expect(sessions[0].solves[0].finalTimeSec).toBe(12);
    expect(sessions[0].solves[1].penalty).toBe('+2');
    expect(sessions[0].solves[0].dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('produces a structured-clone-safe result for the postMessage boundary', async () => {
    const sessions = await runTask('parse', { content: validExport });

    // ADR-0002: a parsed Session must survive a worker message with no Temporal instances.
    expect(() => structuredClone(sessions)).not.toThrow();
  });

  it('rejects invalid content with a descriptive error', async () => {
    await expect(runTask('parse', { content: 'not csTimer json' })).rejects.toThrow(
      /Invalid csTimer file format/i,
    );
  });
});
