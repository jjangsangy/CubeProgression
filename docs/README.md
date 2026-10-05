# CubeProgression — Agent Documentation

This directory is the reference documentation for **CubeProgression**, a client-only
React + TypeScript single-page app that turns [csTimer](https://cstimer.net/) solve
exports into progression and statistics dashboards.

If you are an AI agent working in this repo, start at the root [`AGENTS.md`](../AGENTS.md)
entrypoint, then drill into the pages below.

## Documentation map

| Document | What it covers |
| --- | --- |
| [`architecture.md`](./architecture.md) | Runtime shape, tech stack, directory layout, data flow, state ownership |
| [`data-model.md`](./data-model.md) | Domain types, the csTimer file format, and the parsing pipeline |
| [`statistics.md`](./statistics.md) | Every function in `src/utils/statsMath.ts` and the math behind it |
| [`components.md`](./components.md) | The `App` shell and every React component in `src/components` |
| [`storage.md`](./storage.md) | IndexedDB persistence (`dbStorage.ts`) and browser storage estimates |
| [`theme.md`](./theme.md) | Color audit, centralized theme tokens, 15 themes, light mode & customization |
| [`development.md`](./development.md) | Setup, scripts, testing, lint/format conventions, and gotchas |

## One-paragraph summary

The app has **no backend and no network calls**. On load it either restores the last dataset
from IndexedDB or generates a deterministic 350-solve demo dataset. The user's active session
is parsed from a csTimer export, enriched with rolling WCA averages (`ao5`/`ao12`/`ao50`/`ao100`),
grouped by day/week/month/batch, and rendered through code-split Recharts and hand-written SVG charts.
All statistics are computed synchronously in-memory from the parsed `Solve[]` array, with heavy visualizations
deferred until viewport entry.

## Ground rules for agents

- **Read [`development.md`](./development.md) before editing.** It documents the exact
  Biome formatting rules, the test harness quirks, and the unused dependencies.
- The statistics engine is pure and heavily unit-tested. If you change math, change
  `src/utils/*.test.ts` in the same commit.
- The app is browser-only. Any code touching `window`, `indexedDB`, or `navigator` must
  guard for `undefined` (see `dbStorage.ts`) because Vitest runs in `jsdom`.
- Navigate webpages and inspect rendered DOM with `agent-browser` CLI rather than grabbing raw HTML using `fetch`.
