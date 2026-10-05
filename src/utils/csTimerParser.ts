import type { Session, Solve } from '../types';
import { calculateAoN } from './statsMath';

/**
 * Converts a Unix epoch timestamp (ms) to Temporal.ZonedDateTime in the local or specified timezone
 */
export function toLocalZonedDateTime(ts: number, timeZoneId?: string): Temporal.ZonedDateTime {
  return Temporal.Instant.fromEpochMilliseconds(ts).toZonedDateTimeISO(
    timeZoneId || Temporal.Now.timeZoneId(),
  );
}

/**
 * Accepts epoch ms, Temporal.Instant, Temporal.PlainDate, or Temporal.ZonedDateTime
 */
export type TemporalDateInput =
  | number
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.ZonedDateTime;

/**
 * Formats a Temporal instance or epoch timestamp as YYYY-MM-DD using Temporal in the user's local timezone
 */
export function formatLocalDate(dateOrTs: TemporalDateInput, timeZoneId?: string): string {
  if (typeof dateOrTs === 'number') {
    return toLocalZonedDateTime(dateOrTs, timeZoneId).toPlainDate().toString();
  }
  if (dateOrTs instanceof Temporal.PlainDate) {
    return dateOrTs.toString();
  }
  if (dateOrTs instanceof Temporal.ZonedDateTime) {
    const zdt = timeZoneId ? dateOrTs.withTimeZone(timeZoneId) : dateOrTs;
    return zdt.toPlainDate().toString();
  }
  return dateOrTs
    .toZonedDateTimeISO(timeZoneId || Temporal.Now.timeZoneId())
    .toPlainDate()
    .toString();
}

/**
 * Parses a csTimer export file content (.txt or .json)
 */
export function parseCsTimerFile(fileContent: string): Session[] {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(fileContent);
  } catch (_err) {
    // Attempt cleaning if there's leading/trailing non-JSON text
    const jsonStart = fileContent.indexOf('{');
    const jsonEnd = fileContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        parsedJson = JSON.parse(fileContent.substring(jsonStart, jsonEnd + 1));
      } catch (_e) {
        throw new Error('Failed to parse csTimer file format. Invalid JSON structure.');
      }
    } else {
      throw new Error('Invalid csTimer file format.');
    }
  }

  const sessions: Session[] = [];

  // Extract session names from properties if available
  const sessionNamesMap: Record<string, string> = {};
  if (typeof parsedJson === 'object' && parsedJson !== null) {
    const jsonDict = parsedJson as Record<string, unknown>;
    const properties = jsonDict.properties;
    if (typeof properties === 'object' && properties !== null) {
      const propDict = properties as Record<string, unknown>;
      if (propDict.sessionData) {
        try {
          const sessData =
            typeof propDict.sessionData === 'string'
              ? (JSON.parse(propDict.sessionData) as Record<string, { name?: string }>)
              : (propDict.sessionData as Record<string, { name?: string }>);

          if (typeof sessData === 'object' && sessData !== null) {
            Object.keys(sessData).forEach((key) => {
              if (sessData[key]?.name) {
                sessionNamesMap[key] = sessData[key].name;
              }
            });
          }
        } catch (_e) {
          // Ignore errors parsing custom names
        }
      }
    }

    // Case 1: Standard csTimer JSON with session1, session2, ...
    if (!Array.isArray(parsedJson)) {
      Object.keys(jsonDict).forEach((key) => {
        if (key.startsWith('session')) {
          const rawSolves = jsonDict[key];
          if (Array.isArray(rawSolves) && rawSolves.length > 0) {
            const sessionNum = key.replace('session', '');
            const customName = sessionNamesMap[sessionNum] || `Session ${sessionNum}`;

            const solves = parseSolvesList(rawSolves);
            if (solves.length > 0) {
              sessions.push({
                id: key,
                name: customName,
                solves,
              });
            }
          }
        }
      });
    }
  }

  // Case 2: Array of raw solves directly
  if (Array.isArray(parsedJson) && parsedJson.length > 0) {
    const solves = parseSolvesList(parsedJson);
    if (solves.length > 0) {
      sessions.push({
        id: 'session1',
        name: 'Main Session',
        solves,
      });
    }
  }

  if (sessions.length === 0) {
    throw new Error('No valid csTimer sessions or solves found in the uploaded file.');
  }

  return sessions;
}

/**
 * Converts array of raw csTimer solves into structured Solve objects with Ao12 & Ao50
 */
export function parseSolvesList(rawSolves: unknown[]): Solve[] {
  const solves: Solve[] = [];
  let validSolveIndex = 0;

  for (let i = 0; i < rawSolves.length; i++) {
    const item = rawSolves[i];
    if (!Array.isArray(item) || item.length === 0) continue;

    // Item format in csTimer:
    // [[penalty, time_ms], scramble, comment, timestamp]
    const timeInfo = item[0];
    if (!Array.isArray(timeInfo) || timeInfo.length < 2) continue;

    const penaltyCode = Number(timeInfo[0]);
    const rawTimeMs = Number(timeInfo[1]);

    if (Number.isNaN(rawTimeMs) || rawTimeMs <= 0) continue;

    validSolveIndex++;

    let penalty: 'OK' | '+2' | 'DNF' = 'OK';
    let finalTimeSec = rawTimeMs / 1000;

    // csTimer penalties:
    // 0 = OK
    // 2000 or 2 = +2 penalty (+2000 ms)
    // -1 = DNF
    if (penaltyCode === 2000 || penaltyCode === 2) {
      penalty = '+2';
      finalTimeSec = (rawTimeMs + 2000) / 1000;
    } else if (penaltyCode === -1) {
      penalty = 'DNF';
    }

    const scramble = typeof item[1] === 'string' ? item[1] : undefined;
    const comment = typeof item[2] === 'string' ? item[2] : undefined;

    // Extract timestamp
    let ts = Temporal.Now.instant().epochMilliseconds;
    if (typeof item[3] === 'number' && Number.isFinite(item[3])) {
      ts = item[3];
      // If timestamp is in seconds, convert to ms
      if (ts < 10000000000) {
        ts = ts * 1000;
      }
    } else if (typeof item[1] === 'number' && Number.isFinite(item[1])) {
      ts = item[1] < 10000000000 ? item[1] * 1000 : item[1];
    }

    // Default synthetic timestamps if timestamps are missing or uniform
    // (Spread solves across realistic timeline if needed)
    const dateStr = toLocalZonedDateTime(ts).toPlainDate().toString();

    solves.push({
      id: validSolveIndex,
      index: validSolveIndex,
      timeMs: rawTimeMs,
      rawTimeSec: rawTimeMs / 1000,
      finalTimeSec,
      penalty,
      scramble,
      comment,
      timestamp: ts,
      dateStr,
    });
  }

  // Ensure timestamps are sorted sequentially if they were out of order, or keep natural order
  // Compute rolling Ao5, Ao12, Ao50, and Ao100
  for (let i = 0; i < solves.length; i++) {
    solves[i].ao5 = calculateAoN(solves, i, 5);
    solves[i].ao12 = calculateAoN(solves, i, 12);
    solves[i].ao50 = calculateAoN(solves, i, 50);
    solves[i].ao100 = calculateAoN(solves, i, 100);
  }

  return solves;
}
