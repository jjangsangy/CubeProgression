import { describe, expect, it } from 'vitest';
import {
  formatLocalDate,
  parseCsTimerFile,
  parseSolvesList,
  toLocalZonedDateTime,
} from './csTimerParser';

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
        [null, 'scramble'], // null timeInfo
        [12000, 'scramble'], // primitive timeInfo
        [[0], 'scramble'], // timeInfo length < 2
        [[0, 10000], 'R2 U2 R2', '', 1600000000],
      ];

      const solves = parseSolvesList(rawSolves);
      expect(solves.length).toBe(1);
      expect(solves[0].timeMs).toBe(10000);
    });

    it('falls back to Date.now() when timestamp is missing or NaN', () => {
      const solvesWithoutTs = parseSolvesList([
        [[0, 10000], 'R U R'], // missing timestamp
        [[0, 11000], 'R U R', '', Number.NaN], // NaN timestamp
      ]);
      expect(solvesWithoutTs.length).toBe(2);
      expect(Number.isFinite(solvesWithoutTs[0].timestamp)).toBe(true);
      expect(solvesWithoutTs[0].dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(solvesWithoutTs[1].timestamp)).toBe(true);
      expect(solvesWithoutTs[1].dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

    it('handles timestamps provided at item[1] index in both seconds and ms', () => {
      const rawSolves = [
        [[0, 10000], 1600000000],
        [[0, 12000], 1600000000000],
      ];

      const solves = parseSolvesList(rawSolves);
      expect(solves[0].timestamp).toBe(1600000000000);
      expect(solves[1].timestamp).toBe(1600000000000);
    });

    it('computes dateStr matching local calendar date instead of UTC', () => {
      // Create a local date at 11:30 PM (often the next day in UTC for western timezones)
      const testDate = new Date(2026, 9, 1, 23, 30, 0); // Oct 1, 2026 local
      const tsSec = Math.floor(testDate.getTime() / 1000);

      const solves = parseSolvesList([[[0, 15000], 'R U R', '', tsSec]]);
      expect(solves[0].dateStr).toBe('2026-10-01');
      expect(solves[0].dateStr).toBe(formatLocalDate(testDate));
    });

    it('formats dates accurately across timezones using Temporal', () => {
      // 2026-10-02T01:30:00Z: 1:30 AM Oct 2 in UTC, but 6:30 PM Oct 1 in America/Los_Angeles
      const tsMs = Date.UTC(2026, 9, 2, 1, 30, 0);
      expect(formatLocalDate(tsMs, 'America/Los_Angeles')).toBe('2026-10-01');
      expect(formatLocalDate(tsMs, 'UTC')).toBe('2026-10-02');

      const zdt = toLocalZonedDateTime(tsMs, 'America/Los_Angeles');
      expect(zdt.year).toBe(2026);
      expect(zdt.month).toBe(10);
      expect(zdt.day).toBe(1);
      expect(zdt.hour).toBe(18);
      expect(zdt.minute).toBe(30);
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
        session2: [[[0, 22000], 'L2 D2', '', 1600000100]],
      });

      const sessions = parseCsTimerFile(csTimerJson);
      expect(sessions.length).toBe(2);
      expect(sessions[0].name).toBe('3x3 Main');
      expect(sessions[0].solves.length).toBe(2);
      expect(sessions[1].name).toBe('One Handed');
      expect(sessions[1].solves.length).toBe(1);
    });

    it('parses csTimer JSON when sessionData is an object or missing name properties', () => {
      const csTimerJson = JSON.stringify({
        properties: {
          sessionData: {
            '1': { name: 'Direct Object Name' },
            '2': { opt: { scrType: '333' } }, // no name
          },
        },
        session1: [[[0, 12000], 'R2 U2', '', 1600000000]],
        session2: [[[0, 22000], 'L2 D2', '', 1600000100]],
      });

      const sessions = parseCsTimerFile(csTimerJson);
      expect(sessions.length).toBe(2);
      expect(sessions[0].name).toBe('Direct Object Name');
      expect(sessions[1].name).toBe('Session 2');
    });

    it('skips sessions containing only invalid solves and rejects file if no valid solves remain', () => {
      const jsonWithInvalidSolves = JSON.stringify({
        session1: [[]],
        session2: [[[0, -500]]],
      });
      expect(() => parseCsTimerFile(jsonWithInvalidSolves)).toThrow(
        'No valid csTimer sessions or solves found in the uploaded file.',
      );

      const arrayWithInvalidSolves = JSON.stringify([[], [[0, -100]]]);
      expect(() => parseCsTimerFile(arrayWithInvalidSolves)).toThrow(
        'No valid csTimer sessions or solves found in the uploaded file.',
      );

      const primitiveJson = JSON.stringify('just a string');
      expect(() => parseCsTimerFile(primitiveJson)).toThrow(
        'No valid csTimer sessions or solves found in the uploaded file.',
      );
    });

    it('parses csTimer JSON with surrounding text/comments', () => {
      const csTimerJson = JSON.stringify({
        session1: [[[0, 10000], 'R2 U2', '', 1600000000]],
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

    it('throws specific error when text has braces but is invalid JSON structure', () => {
      expect(() => parseCsTimerFile('prefix { invalid json structure: true, } suffix')).toThrow(
        'Failed to parse csTimer file format. Invalid JSON structure.',
      );
    });

    it('handles malformed sessionData gracefully', () => {
      const csTimerJson = JSON.stringify({
        properties: {
          sessionData: 'invalid json string here',
        },
        session1: [[[0, 10000], 'R2 U2', '', 1600000000]],
      });

      const sessions = parseCsTimerFile(csTimerJson);
      expect(sessions.length).toBe(1);
      expect(sessions[0].name).toBe('Session 1');
    });

    it('throws error when no valid sessions or solves exist', () => {
      const emptyJson = JSON.stringify({ session1: [] });
      expect(() => parseCsTimerFile(emptyJson)).toThrow(
        'No valid csTimer sessions or solves found in the uploaded file.',
      );
    });
  });
});
