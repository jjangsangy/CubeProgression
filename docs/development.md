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

Test files are colocated with source: `src/**/*.test.ts(x)`; mock only external/browser
APIs (see `ChartCardWrapper.test.tsx` mocking `html-to-image`).

### Test authoring & selector hygiene

Tests must pin **observable behavior**, never the wording of the UI. Copy and accessible
names churn constantly, so a test that breaks when a label is reworded is not testing the
app — it is testing a string. The following are non-negotiable.

**Banned selectors & assertions**

| Never use | Why |
| --- | --- |
| `getByText` / `findByText` / `queryByText` / `getAllByText`, Playwright `text=` / `getByText` | asserts on user-facing copy |
| `toHaveTextContent('literal')` / `toContainText('literal')`, Playwright `toHaveText(…)` | asserts on user-facing copy |
| `getByRole(..., { name })` | an accessible name is user-facing copy by another route |
| Playwright `{ hasText: … }` locator/filter options | a text lookup wearing an option-bag disguise |
| `getByLabelText` / `getByLabel` / `getByTitle` / `getByPlaceholderText` / `getByDisplayValue` / `getByAltText` | label/title/placeholder/alt text is copy |
| CSS `[aria-label…]` / `[title…]` (including `*=`, `^=`, `$=`) | a label lookup wearing a CSS disguise |
| `getByTestId` / `findByTestId` / `queryByTestId` / `getAllByTestId`, `data-testid` / `data-test-id` / a `testId` prop | the repo does not ship test ids |

An `aria-label` is *almost the same thing* as selecting by name — never reach for one just to
give a test a hook. Real accessibility attributes are for users, not tests.

The same applies to `textContent`: reading it is only for a genuine **computed/contract value**
(e.g. a formatted time, a pagination counter) or a behaviour signal. Re-homing a banned
`getByText('Some Label')` into `expect(el.textContent).toContain('Some Label')` is the same
brittle copy assertion in a new disguise — the plugin cannot see it, so it is on the author.

**What to assert instead**

- **State attributes**: `aria-pressed`, `aria-valuenow`, `disabled` / `toBeDisabled`,
  `value` / `toHaveValue`, `colspan`, `aria-modal`, and similar.
- **Structure & counts**: `querySelectorAll(...).length`, presence/absence of an anchored
  control, `expect(...).toHaveCount(n)`.
- **Behavior**: drive the interaction with `@testing-library/user-event` or `fireEvent`
  (Vitest) or Playwright, then assert the *resulting state* changed.
- **Contract values**: values the app genuinely owns — e.g. a download's
  `suggestedFilename()` prefix, a pagination indicator's `"2 / 24"` — are fair game, because
  they are behavior, not decorative chrome. Read them off the anchored element
  (`expect(await el.textContent()).toBe('2 / 24')`) rather than selecting the node by its text.
- **Membership without text**: to check that a legend/series exists, count its entries or
  assert the count *delta* after a toggle (`expect.poll(() => entries.count()).toBe(before - 1)`) —
  do not match on the entry's label string.

**Anchoring**

- The sanctioned anchor is a plain `id` on a **distinct control or region** (e.g.
  `#file-uploader`, `#grouping-weekly`, `#solves-table`), queried with
  `container.querySelector('#…')` / `page.locator('#…')`.
- **Don't overuse ids.** Add one only when no existing stable anchor reaches the element, and
  never put an id on decorative or display-only text nodes just to make them findable.
- **No test-only hooks in production code.** Do not add a test-only `className`, an inert
  `name`/`value` to a button, or an `aria-label` whose only purpose is to be selected.
- **Beware selectors that can silently match nothing.** A chain like
  `svg[aria-hidden="true"] g:has(> title) > line` must be paired with a count guard
  (`expect(count).toBeGreaterThan(0)`) so a broken selector fails loudly instead of vacuously
  passing. Avoid hard-coded colors (`[stroke="#94a3b8"]`), Tailwind-class regexes tied to
  styling, and magic pixels.

**Quality bar**

- No **tautological** assertions — e.g. asserting the absence of a `data-testid` that never
  existed.
- No testing for testing's sake — a test that only asserts Tailwind classes pins nothing
  observable; delete it.
- When migrating a test off a brittle selector, **keep the behavioral assertions**. Do not
  weaken "value/state X" into a mere existence check, and do not drop coverage.

**Enforcement**

Two GritQL plugins are wired into `biome.json` and run during `bun run check`:

- `plugins/no-brittle-test-selectors.grit` (scope: `*.test.ts(x)` / `*.spec.ts(x)`) errors on
text/label queries, `*ByRole(..., { name })`, `{ hasText }` options, `toHaveText`/
`toHaveTextContent`/`toContainText`, and CSS `[aria-label…]`/`[title…]`/`[data-testid…]`
locator strings. The pre-existing backlog is fully burned down, so it runs at **`error`**.
- `plugins/no-test-hooks.grit` (scope: every `.ts`/`.tsx`) errors on a shipped `data-testid`
attribute or `testId` prop.

Notes for maintainers editing the plugins:

- Biome requires the whole rule set in a single root `or { … }` pattern; multiple top-level
  patterns fail to compile.
- `register_diagnostic`'s `span` must bind a real AST node, not a string literal's inner
  content.
- Grit regexes are **full-match**, so wrap patterns in `.*….*`, and use non-capturing groups
  (`(?:…)`) — a capturing group is misread as a Grit metavariable.
- Biome formats the `.grit` files, so run `bun run check:write` after editing them.

- **E2E tests (`bun run test:e2e`)**: **Mandatory for all UI, layout, and deferral changes.**
  Because Vitest runs in `jsdom` where `IntersectionObserver` is absent and elements have 0×0
  dimensions, only the full Playwright suite validates real browser viewport deferral,
  mobile responsive breakpoints, and below-the-fold chart interaction.
- **Navigate webpages with `agent-browser` (never grab raw HTML with `fetch`)**: Rather than grabbing HTML from webpages using `fetch` or HTTP requests, always use **`agent-browser`** CLI (`agent-browser open <url>`, `agent-browser snapshot -i`, `agent-browser read`, `agent-browser click`, etc.) to navigate webpages, inspect rendered content, and interact with web pages. Real browser automation ensures JavaScript SPAs, hydration, dynamic layouts, and client-rendered elements are fully evaluated.
- **Visual verification and page inspection with `agent-browser`**: Any UI or layout changes **must always be verified with screenshot confirmation and inspected** using **`agent-browser`** CLI (e.g. `agent-browser open <url>`, `agent-browser snapshot -i`, and `agent-browser screenshot screenshots/<name>.png`). **Always save screenshots into the `screenshots/` directory** (e.g. `screenshots/desktop-1280x800.png`, `screenshots/mobile-portrait-390x844.png`) so the project root stays clean. Visual verification across viewports (e.g. mobile portrait `390x844`, mobile landscape `844x390`, tablet portrait `768x1024`, and desktop `1280x800`) must be confirmed via `agent-browser set viewport <w> <h> 2` and `agent-browser screenshot screenshots/<viewport>.png` before finalizing work. Never assume visual layout correctness without visually inspecting the rendered screenshots to confirm balanced spacing, no element overlap, and no boundary overflow.
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
- **Worker in tests**: `Worker` is `undefined` under jsdom, so `getWorkerPool()` resolves to
  the in-page adapter and `parse` runs on the calling thread — unit tests never touch a real
  worker. The real dedicated-worker path is exercised only by Playwright E2E (`test:e2e`),
  which is why upload changes are gated on the E2E suite. The worker is bundled as an ES
  module (`worker.format: 'es'` in `vite.config.ts`) because it dynamically imports the
  Temporal polyfill.
- **Determinism**: `generateSampleData()` is seeded, so demo output is stable. Its main
  session is `session1` (`F2L Yellow Cross Progression (Demo)`), asserted at the **data
  layer** in `sampleData.test.ts` — UI tests must not assert that title via `getByText`.
- **Locale/timezone**: dates use the runtime local timezone via `Temporal`. Native JS `Date` is strictly forbidden. Tests that
  assert on `dateStr` values should avoid timezone-sensitive fixtures.
- **`DISABLE_HMR`**: setting it to `"true"` disables HMR and file watching (used by AI Studio).
- **No backend**: never introduce server calls or secret-dependent code; this is a static SPA.
