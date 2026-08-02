import { Session, Solve } from '../types';
import { parseSolvesList } from './csTimerParser';

/**
 * Generates a realistic 350-solve csTimer dataset matching the user's reference images
 * (7 days of practice, 50 solves per day, progression from ~23.5s down to ~19.8s)
 */
export function generateSampleData(): Session[] {
  const rawSolves: any[] = [];
  const baseTimestamp = new Date('2026-07-25T09:00:00Z').getTime();

  // Pseudo random generator with deterministic seed for reproducible nice plots
  let seed = 12345;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Box-Muller transform for normal distribution
  const randomGaussian = (mean: number, stdDev: number) => {
    const u1 = Math.max(0.0001, pseudoRandom());
    const u2 = pseudoRandom();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  const dayParams = [
    { day: 1, mean: 23.5, std: 6.8, minLimit: 12.0, maxLimit: 42.0 },
    { day: 2, mean: 22.0, std: 5.6, minLimit: 11.4, maxLimit: 39.5 },
    { day: 3, mean: 21.0, std: 4.6, minLimit: 13.2, maxLimit: 32.7 },
    { day: 4, mean: 22.2, std: 5.7, minLimit: 10.8, maxLimit: 40.3 },
    { day: 5, mean: 22.5, std: 6.0, minLimit: 13.4, maxLimit: 42.8 },
    { day: 6, mean: 20.6, std: 5.1, minLimit: 12.8, maxLimit: 32.6 },
    { day: 7, mean: 19.8, std: 4.8, minLimit: 11.5, maxLimit: 32.8 },
  ];

  const scramblesList = [
    "R2 U F2 R2 B2 D L2 B2 D2 U R' B D F U2 B2 L F R'",
    "F2 D' L2 R2 U F2 U' L2 B2 R2 U' B' R' U2 B2 L D' F' R2 U'",
    "B2 U2 L2 U2 B2 F2 R2 U' L2 U L2 B' D' R' F U2 L B' D2 R2",
    "D2 R2 F2 U' L2 B2 U2 F2 D' B2 R2 B L' U' B2 F D R B2 F",
    "U2 B2 L2 D' R2 F2 D' B2 U' R2 U' L B D' R2 U B F' U' R",
    "L2 D2 B2 D2 F2 U2 R2 F2 L2 U' R2 F' D2 L' D B' U R B' U",
    "F2 R2 D2 U' L2 U' B2 F2 U L2 F2 L' B U2 F L R2 D B U",
    "D2 B2 U2 R2 B2 L2 D' B2 U2 B2 U L' F' D R U F2 L2 D' R",
  ];

  let currentSolveNum = 0;

  dayParams.forEach((param, dayIdx) => {
    const dayStartTime = baseTimestamp + dayIdx * 86400000; // +1 day per group

    for (let i = 0; i < 50; i++) {
      currentSolveNum++;
      const solveTimeOffset = i * (120 * 1000) + Math.floor(pseudoRandom() * 30000); // ~2 mins apart
      const timestamp = Math.floor((dayStartTime + solveTimeOffset) / 1000);

      // Trend component: overall slight drop over the 350 solves
      const trendFactor = -0.0095 * currentSolveNum;
      
      let rawTimeSec = randomGaussian(param.mean + trendFactor, param.std);
      
      // Ensure bounds
      rawTimeSec = Math.max(param.minLimit, Math.min(param.maxLimit, rawTimeSec));

      // Occasional spikes (outliers)
      if (pseudoRandom() < 0.03) {
        rawTimeSec += 10 + pseudoRandom() * 8;
      }

      // Occasional +2 penalty or DNF
      let penalty = 0;
      if (pseudoRandom() < 0.02) {
        penalty = 2000; // +2
      } else if (pseudoRandom() < 0.008) {
        penalty = -1; // DNF
      }

      const timeMs = Math.round(rawTimeSec * 1000);
      const scramble = scramblesList[currentSolveNum % scramblesList.length];
      const comment = i === 0 ? `Day ${dayIdx + 1} warm up` : '';

      rawSolves.push([[penalty, timeMs], scramble, comment, timestamp]);
    }
  });

  const solves: Solve[] = parseSolvesList(rawSolves);

  return [
    {
      id: 'session1',
      name: 'F2L Yellow Cross Progression (Demo)',
      solves,
    },
    {
      id: 'session2',
      name: '3x3 General Solves',
      solves: solves.slice(100, 250),
    }
  ];
}
