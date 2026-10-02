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
| `preview` | `vite preview` | Serve the built bundle |
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

- **CI**: Automated test runner on GitHub Actions (`.github/workflows/test.yml`) runs tests
  on pushes and pull requests targeting `main` across all supported platforms:
  `ubuntu-latest`, `macos-latest`, and `windows-latest`. Automated deployment to GitHub Pages
  is configured via `.github/workflows/deploy.yml` on pushes to `main`.

## Lint & format — Biome `biome.json`

- Includes everything except `dist`, `coverage`, `.tmp`; respects `.gitignore`.
- Formatter: **2-space** indent, **LF** line endings, **line width 100**.
- JS: **single quotes**, **always semicolons**, **trailing commas everywhere**.
- JSX: **double quotes** for attributes.
- Linter: `recommended` preset.
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

- **Unused dependencies**: `d3` and `@types/d3` are declared but not imported anywhere in
  `src` (the box plot is hand-written SVG). `@google/genai` is declared and advertised in
  `metadata.json`, but there is **no Gemini code in the app**. Don't assume they're wired up;
  if you add usage, that's a deliberate new feature.
- **IndexedDB in tests**: `openDB()` returns `null` under jsdom, so persistence is disabled
  and `App.test.tsx` always exercises the demo fallback.
- **Determinism**: `generateSampleData()` is seeded, so demo output is stable —
  `App.test.tsx` asserts on the exact session title `F2L Yellow Cross Progression (Demo)`.
- **Locale/timezone**: dates use the runtime local timezone via `Temporal`. Tests that
  assert on `dateStr` values should avoid timezone-sensitive fixtures.
- **`DISABLE_HMR`**: setting it to `"true"` disables HMR and file watching (used by AI Studio).
- **No backend**: never introduce server calls or secret-dependent code; this is a static SPA.
