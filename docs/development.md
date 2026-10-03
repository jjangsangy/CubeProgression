# Development Guide

## Prerequisites

- [Bun](https://bun.sh/) **v1.1+** (the repo uses `bun.lock`; `package.json` scripts are
  invoked with Bun).

## Install & run

```bash
bun install        # install dependencies
bun run dev        # Vite dev server on http://localhost:3000 (host 0.0.0.0)
```

## Scripts (from `package.json`)

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite --port=3000 --host=0.0.0.0` | Dev server, HMR (disabled when `DISABLE_HMR=true`) |
| `build` | `vite build` | Production bundle to `dist/` |
| `preview` | `vite preview --port=3100` | Serve the built bundle on port 3100 |
| `clean` | `rm -rf dist` | Remove build output |
| `typecheck` | `tsc --noEmit` | TypeScript check (no emit) |
| `lint` | `biome lint` | Lint only |
| `lint:fix` | `biome lint --write` | Apply safe lint fixes |
| `format` | `biome format --write` | Format code |
| `format:check` | `biome format` | Check formatting |
| `check` | `biome check` | Lint + format + import organization |
| `check:write` | `biome check --write` | Apply all safe Biome fixes |
| `test` | `vitest run` | Run the test suite once |
| `test:coverage` | `vitest run --coverage` | Tests + v8 coverage |
| `test:e2e` | `playwright test` | Run Playwright E2E tests (lean preview bundle on port 3200) |
| `test:e2e:dev` | `E2E_DEV=true playwright test` | Run E2E tests against Vite dev server on port 3200 |
| `test:e2e:ui` | `playwright test --ui` | Playwright interactive UI runner |
| `test:e2e:report` | `playwright show-report` | Open latest HTML test report |

Run everything via Bun, e.g. `bun run test`, `bun run typecheck`, `bun run check:write`.

## Testing harness

- Runner: **Vitest 5**, `globals: true` (so `describe`/`it`/`expect` are global, though
  tests still import them explicitly from `vitest`).
- Environment: **`jsdom`**; setup file `src/setupTests.tsx` runs before every suite.
- Coverage: v8 provider, `text`/`json`/`html` reporters, excluding `node_modules/`,
  `src/setupTests.tsx`, `src/main.tsx`, and `src/types.ts`.

`setupTests.tsx` provides the polyfills/mocks the charts need in jsdom:

- A no-op `ResizeObserver` (Recharts and the box plot measure container width).
- A mocked `HTMLCanvasElement.prototype.getContext` and `URL.createObjectURL` /
  `revokeObjectURL` (for `html-to-image` and downloads).
- A `window.matchMedia` polyfill.
- A **Recharts mock** replacing `ResponsiveContainer` with a fixed 800×400 `<div>`, because
  responsive containers render at 0×0 in jsdom.

Test files are colocated with source: `src/**/*.test.ts(x)`. Prefer asserting on visible
text (RTL) and mocking only external/browser APIs (see `ChartCardWrapper.test.tsx` mocking
`html-to-image`).

- **E2E tests (`bun run test:e2e`)**: **Mandatory for all UI, layout, and deferral changes.**
  Because Vitest runs in `jsdom` where `IntersectionObserver` is absent and elements have 0×0
  dimensions, only the full Playwright suite validates real browser viewport deferral,
  mobile responsive breakpoints, and below-the-fold chart interaction.
- **CI**: Automated test runner on GitHub Actions (`.github/workflows/test.yml`) runs tests
  on pushes and pull requests targeting `main` across all supported platforms:
  `ubuntu-latest`, `macos-latest`, and `windows-latest`. Linting and type checking run in
  `.github/workflows/lint.yml`. Automated deployment to GitHub Pages is configured via
  `.github/workflows/deploy.yml`. Because `workflow_run` fires once per listed workflow, deploy is
  triggered by the single `E2E Tests` workflow and then waits for the `Test Runner` and
  `Lint & Type Check` checks on the same commit via `lewagon/wait-on-check-action`, so it runs
  exactly once and only when all test and lint suites pass on `main`.

## Lint & format — Biome `biome.json`

- Includes everything except `dist`, `coverage`, `.tmp`; respects `.gitignore`.
- Formatter: **2-space** indent, **LF** line endings, **line width 100**.
- JS: **single quotes**, **always semicolons**, **trailing commas everywhere**.
- JSX: **double quotes** for attributes.
- Linter: `recommended` preset, with `noRestrictedGlobals` and `noRestrictedTypes` denying JavaScript `Date`.
- Assist: **organize imports** is on (`biome check --write` will reorder imports).

Match these rules when hand-writing code; run `bun run check:write` before finishing.

## TypeScript `tsconfig.json`

- Target `ES2022`, `lib`: `ES2022`, `DOM`, `DOM.Iterable`; `module`/`moduleResolution`:
  `ESNext` / `bundler`; `jsx: react-jsx`; `noEmit`.
- `isolatedModules` + `moduleDetection: force` — every file must be a module.
- `allowImportingTsExtensions: true` — imports may use `.ts`/`.tsx` extensions.
- `allowJs`, `skipLibCheck`, `experimentalDecorators: true`,
  `useDefineForClassFields: false` are enabled.
- Path alias `@/* → ./*` (project root). Vite mirrors this in `vite.config.ts`.
- Includes `src` and `vite.config.ts`.

## Conventions

- **Temporal only — JS `Date` strictly forbidden**: All date, time, and timestamp handling must use ECMAScript standard `Temporal` (e.g. `Temporal.Now.instant().epochMilliseconds`, `Temporal.Instant`, `Temporal.PlainDate`, `Temporal.ZonedDateTime`). Never use `new Date()`, `Date.now()`, `Date.UTC()`, or the `Date` type anywhere in source files, utilities, or test fixtures. Biome enforces this via `noRestrictedGlobals` and `noRestrictedTypes`.
- **Imports**: relative paths are the norm (`../types`, `./statsMath`); `@/...` also works.
  Node built-ins use the `node:` prefix.
- **Styling**: Tailwind utility classes inline. The dark "stone" palette is the design
  system; charts use the Tailwind color hexes directly (e.g. `#ef4444`, `#22c55e`).
- **Statistics**: keep `statsMath.ts` pure and free of React/DOM. Consumers memoize with
  `useMemo`.
- **Charts**: wrap new charts in `ChartCardWrapper` and derive titles/labels from
  `getPeriodUnitInfo`.
- **Types**: add new domain shapes to `src/types.ts`, not inline, when they cross modules.
- **Comments**: explain non-obvious intent (e.g. the `skipFonts` CORS note), not the code.

## Common tasks

### Add a new chart

1. Create `src/components/MyChart.tsx` exporting `MyChart: React.FC<Props>`.
2. Wrap the body in `ChartCardWrapper` with a `title`, `subtitle`, and `filenamePrefix`.
3. Compute data with `useMemo` from `solves`/`periodGroups` props.
4. Add a colocated `MyChart.test.tsx` (mock `html-to-image` if it exports PNG).
5. Render it in `App.tsx` inside the `activeSession && globalStats` block.

### Change the statistics math

1. Edit `src/utils/statsMath.ts`; keep functions pure and typed.
2. Update/extend `src/utils/statsMath.test.ts` with fixtures covering the new behavior.
3. Run `bun run test` and `bun run typecheck`.

### Add a grouping mode

1. Extend `GroupingPeriod` in `src/types.ts`.
2. Handle it in `groupSolvesByPeriod` and `getPeriodUnitInfo` (`statsMath.ts`).
3. Add a control in `FileUploader.tsx` and ensure `App.tsx` can select it.

## Gotchas & notes

- **Pruned dependencies**: legacy unused packages (`@google/genai`, `d3`, `@types/d3`, `motion`) have been completely pruned from `package.json`. Animations are handled with standard Tailwind / CSS `@keyframes`.
- **Chunking & Build Optimizations**: `vite.config.ts` partitions production builds into `react-vendor`, `recharts-vendor`, and `temporal-vendor` chunks, targeted to `es2022` with `lightningcss`. Compiled CSS is inlined directly into `index.html` by `inlineCriticalCss()` to eliminate render-blocking network requests. Heavy deferred scripts (`recharts-vendor`, `temporal-vendor`) are filtered from initial `<link rel="modulepreload">` tags to protect critical path metrics.
- **Conditional Polyfills**: `temporal-polyfill` is loaded conditionally via `src/utils/temporalLoader.ts` (`ensureTemporal()`) only on older browsers that lack standard `Temporal`. Modern engines run native `Temporal` with zero polyfill transfer overhead.
- **IndexedDB in tests**: `openDB()` returns `null` under jsdom, so persistence is disabled
  and `App.test.tsx` always exercises the demo fallback.
- **Determinism**: `generateSampleData()` is seeded, so demo output is stable —
  `App.test.tsx` asserts on the exact session title `F2L Yellow Cross Progression (Demo)`.
- **Locale/timezone**: dates use the runtime local timezone via `Temporal`. Native JS `Date` is strictly forbidden. Tests that
  assert on `dateStr` values should avoid timezone-sensitive fixtures.
- **`DISABLE_HMR`**: setting it to `"true"` disables HMR and file watching (used by AI Studio).
- **No backend**: never introduce server calls or secret-dependent code; this is a static SPA.
