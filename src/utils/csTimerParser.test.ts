import { describe, it, expect } from 'vitest';
import { parseCsTimerFile, parseSolvesList } from './csTimerParser';

describe('csTimerParser utils', () => {
  describe('parseSolvesList', () => {
    it('parses standard csTimer raw solves array', () => {
      const rawSolves = [
        [[0, 12500], 'R2 U2 R2', '', 1600000000],
        [[2000, 10000], 'U2 R2 U2', 'plus two', 1600000060],
        [[-1, 14000], 'F2 R2 F2', 'dnf', 1600000120],
      ];

      const solves = parseSolvesList(rawSolves);
      expect(solves.length).toBe(3);

      // Solve 1: OK
      expect(solves[0].penalty).toBe('OK');
      expect(solves[0].rawTimeSec).toBe(12.5);
      expect(solves[0].finalTimeSec).toBe(12.5);
      expect(solves[0].scramble).toBe('R2 U2 R2');

      // Solve 2: +2 penalty -> 10s + 2s = 12s final
      expect(solves[1].penalty).toBe('+2');
      expect(solves[1].finalTimeSec).toBe(12.0);
      expect(solves[1].comment).toBe('plus two');

      // Solve 3: DNF penalty
      expect(solves[2].penalty).toBe('DNF');
    });

    it('ignores empty or malformed solve entries', () => {
      const rawSolves = [
        [],
        'invalid',
        [[0, -500]], // negative time
        [[0, 'NaN']], // NaN time
        [[0, 10000], 'R2 U2 R2', '', 1600000000],
      ];

      const solves = parseSolvesList(rawSolves);
      expect(solves.length).toBe(1);
      expect(solves[0].timeMs).toBe(10000);
    });

    it('handles timestamps in seconds vs milliseconds', () => {
      const rawSolves = [
        [[0, 10000], 'scramble', '', 1600000000], // in seconds (10 digits)
        [[0, 11000], 'scramble', '', 1600000000000], // in milliseconds (13 digits)
      ];

      const solves = parseSolvesList(rawSolves);
      expect(solves[0].timestamp).toBe(1600000000000);
      expect(solves[1].timestamp).toBe(1600000000000);
    });
  });

  describe('parseCsTimerFile', () => {
    it('parses standard csTimer JSON with multiple sessions and custom session names', () => {
      const csTimerJson = JSON.stringify({
        properties: {
          sessionData: JSON.stringify({
            '1': { name: '3x3 Main' },
            '2': { name: 'One Handed' },
          }),
        },
        session1: [
          [[0, 12000], 'R2 U2', '', 1600000000],
          [[0, 11000], 'U2 R2', '', 1600000060],
        ],
        session2: [
          [[0, 22000], 'L2 D2', '', 1600000100],
        ],
      });

      const sessions = parseCsTimerFile(csTimerJson);
      expect(sessions.length).toBe(2);
      expect(sessions[0].name).toBe('3x3 Main');
      expect(sessions[0].solves.length).toBe(2);
      expect(sessions[1].name).toBe('One Handed');
      expect(sessions[1].solves.length).toBe(1);
    });

    it('parses csTimer JSON with surrounding text/comments', () => {
      const csTimerJson = JSON.stringify({
        session1: [
          [[0, 10000], 'R2 U2', '', 1600000000],
        ],
      });
      const fileWithNoise = `// Export generated on 2026-08-01\n${csTimerJson}\n// End export`;

      const sessions = parseCsTimerFile(fileWithNoise);
      expect(sessions.length).toBe(1);
      expect(sessions[0].name).toBe('Session 1');
      expect(sessions[0].solves.length).toBe(1);
    });

    it('parses direct raw solves array JSON', () => {
      const csTimerJson = JSON.stringify([
        [[0, 10000], 'R2 U2', '', 1600000000],
        [[0, 11000], 'U2 R2', '', 1600000060],
      ]);

      const sessions = parseCsTimerFile(csTimerJson);
      expect(sessions.length).toBe(1);
      expect(sessions[0].name).toBe('Main Session');
      expect(sessions[0].solves.length).toBe(2);
    });

    it('throws error when JSON is invalid', () => {
      expect(() => parseCsTimerFile('Not JSON at all')).toThrow('Invalid csTimer file format.');
    });

    it('throws error when no valid sessions or solves exist', () => {
      const emptyJson = JSON.stringify({ session1: [] });
      expect(() => parseCsTimerFile(emptyJson)).toThrow(
        'No valid csTimer sessions or solves found in the uploaded file.'
      );
    });
  });
});
