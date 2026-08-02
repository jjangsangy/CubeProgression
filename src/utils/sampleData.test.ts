import { describe, it, expect } from 'vitest';
import { generateSampleData } from './sampleData';

describe('sampleData utils', () => {
  it('generates demo session with 350 solves', () => {
    const sessions = generateSampleData();
    expect(sessions.length).toBeGreaterThan(0);

    const mainSession = sessions[0];
    expect(mainSession.id).toBe('session1');
    expect(mainSession.name).toBe('F2L Yellow Cross Progression (Demo)');
    expect(mainSession.solves.length).toBe(350);

    // Verify first and last solves
    const firstSolve = mainSession.solves[0];
    expect(firstSolve.id).toBe(1);
    expect(firstSolve.finalTimeSec).toBeGreaterThan(0);
    expect(firstSolve.dateStr).toBeDefined();

    const lastSolve = mainSession.solves[349];
    expect(lastSolve.id).toBe(350);
    expect(lastSolve.ao12).toBeDefined();
    expect(lastSolve.ao50).toBeDefined();
  });
});
