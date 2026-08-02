import { RawSolve, Solve, Session } from '../types';
import { calculateAoN } from './statsMath';

/**
 * Parses a csTimer export file content (.txt or .json)
 */
export function parseCsTimerFile(fileContent: string): Session[] {
  let parsedJson: any;

  try {
    parsedJson = JSON.parse(fileContent);
  } catch (err) {
    // Attempt cleaning if there's leading/trailing non-JSON text
    const jsonStart = fileContent.indexOf('{');
    const jsonEnd = fileContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        parsedJson = JSON.parse(fileContent.substring(jsonStart, jsonEnd + 1));
      } catch (e) {
        throw new Error('Failed to parse csTimer file format. Invalid JSON structure.');
      }
    } else {
      throw new Error('Invalid csTimer file format.');
    }
  }

  const sessions: Session[] = [];

  // Extract session names from properties if available
  let sessionNamesMap: Record<string, string> = {};
  if (parsedJson.properties && parsedJson.properties.sessionData) {
    try {
      const sessData = typeof parsedJson.properties.sessionData === 'string' 
        ? JSON.parse(parsedJson.properties.sessionData)
        : parsedJson.properties.sessionData;

      Object.keys(sessData).forEach((key) => {
        if (sessData[key] && sessData[key].name) {
          sessionNamesMap[key] = sessData[key].name;
        }
      });
    } catch (e) {
      // Ignore errors parsing custom names
    }
  }

  // Case 1: Standard csTimer JSON with session1, session2, ...
  if (typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
    Object.keys(parsedJson).forEach((key) => {
      if (key.startsWith('session')) {
        const rawSolves = parsedJson[key];
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
export function parseSolvesList(rawSolves: any[]): Solve[] {
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

    if (isNaN(rawTimeMs) || rawTimeMs <= 0) continue;

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
    let ts = Date.now();
    if (typeof item[3] === 'number') {
      ts = item[3];
      // If timestamp is in seconds, convert to ms
      if (ts < 10000000000) {
        ts = ts * 1000;
      }
    } else if (typeof item[1] === 'number') {
      ts = item[1] < 10000000000 ? item[1] * 1000 : item[1];
    }

    // Default synthetic timestamps if timestamps are missing or uniform
    // (Spread solves across realistic timeline if needed)
    const solveDate = new Date(ts);
    const dateStr = solveDate.toISOString().split('T')[0];

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
      date: solveDate,
      dateStr,
    });
  }

  // Ensure timestamps are sorted sequentially if they were out of order, or keep natural order
  // Compute rolling Ao12 and Ao50
  for (let i = 0; i < solves.length; i++) {
    solves[i].ao12 = calculateAoN(solves, i, 12);
    solves[i].ao50 = calculateAoN(solves, i, 50);
  }

  return solves;
}
