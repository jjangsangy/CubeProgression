# Component Catalog

All components live in [`src/components/`](../src/components) (plus the `App` shell in
`src/App.tsx`). Components are **presentational**: they receive data and callbacks via
props and hold only *local UI* state (filters, toggles, modal open/closed). No Redux,
Zustand, or React Context is used.

Every chart card is wrapped in `ChartCardWrapper`, which owns the shared chrome (title,
subtitle, badge, PNG export, fullscreen modal).

## `App` (`src/App.tsx`)

The main shell component connecting `useCubeDataset()` to presentational layout components.

- **Coordinates**: `Navbar`, `FileUploader`, `DashboardView`, and `Footer`.
- **State source**: `useCubeDataset()` custom hook (`src/hooks/useCubeDataset.ts`).

## `DashboardView` (`DashboardView.tsx`)

Presentational container for session metrics and progression charts. Props: `session`, `stats`, `periodGroups`, `groupingPeriod`.

- Renders `MetricsOverviewCards`, `ProgressionChart`, `PbProgressionChart`, `DailyDistributionBoxPlot`, `DensityShiftChart`, `MetricsEvolutionChart`, and `SolvesTable`.
- Renders `null` when `session` or `stats` are empty.
- Enables isolated testing of the entire progression visualization grid without mounting dataset storage hooks.

## `Footer` (`Footer.tsx`)

Presentational footer component with safe-area styling (`safe-area-x safe-area-bottom`).

## `Navbar` (`Navbar.tsx`)

Top header. Props: `fileName`, `onLoadDemo`, `onReset`, `onExportCSV`, `isSaved`,
`storageUsageMB`, `onClearStorage`.

- Brand block + "csTimer Analytics" badge.
- Shows a green "Saved locally (N MB)" pill when `isSaved`, and a file-name chip.
- Buttons: **Load Sample Data**, **Export CSV**, and a reset control that becomes a
  destructive "clear storage" (trash) icon once data is saved.

## `FileUploader` (`FileUploader.tsx`)

The upload + configuration panel.

- Drag-and-drop **and** click-to-browse dropzone (`accept=".txt,.json"`). Disabled while loading.
- Props include `sessions`, `selectedSessionId`, `onSelectSession`, grouping controls
  (`groupingPeriod`, `onChangeGrouping`, `customBatchSize`, `onChangeCustomBatchSize`),
  `onFileUpload`, `onLoadDemo`, `errorMsg`, and the loading/storage props.
- Renders group-by buttons (Day / Week / Month / Batch-50 / Custom batch) and a session
  selector when multiple sessions exist.
- When `isLoading`, renders the `CubeLoadingSpinner` with a progress bar, elapsed timer, and
  `loadingStage` text via `AnimatePresence`.

## `ChartCardWrapper` (`ChartCardWrapper.tsx`)

Shared wrapper for every chart. Props: `title`, `subtitle?`, `children`, `headerBadge?`,
`headerControls?`, `filenamePrefix?`.

- Header with badge + title, optional subtitle, optional controls row, and a
  `export-exclude` action cluster (PNG download, maximize).
- **Fullscreen**: `isMaximized` renders a fixed backdrop overlay; closes on `Escape`;
  locks `document.body` scroll while open.
- **PNG export**: `handleDownloadImage` measures the true unclipped size of the card
  (including scrollable descendants), then calls `html-to-image`'s `toPng` with
  `pixelRatio: 2`, `skipFonts: true` (avoids CORS font failures), and a stone-950
  background. It retries with `pixelRatio: 1`, then falls back to `toCanvas`. An `onClone`
  hook pins live Recharts/SVG pixel dimensions into the clone so exports don't collapse.
- `triggerBlobDownload` converts base64 data URLs to `Blob` objects for reliable downloads
  in cross-origin/iframe contexts.

> If you add a new chart, wrap it in this component so it inherits export + fullscreen.

## `MetricsOverviewCards` (`MetricsOverviewCards.tsx`)

Five summary KPI cards from `GlobalStats`: Best Single, Best Averages (Ao12/Ao50), Overall
Rate (regression slope), Progression Gain (baseline vs recent delta + %), and Session Solves
(total + DNFs + mean). Purely display.

## `ProgressionChart` (`ProgressionChart.tsx`)

The main time-series chart (Recharts `ComposedChart`). Props: `solves`, `periodGroups`,
`regression`, `groupingPeriod?`, `title?`.

- Plots individual solve times (`single`) plus toggleable moving averages `ao5`/`ao12`/
  `ao50`/`ao100`, a trend line, and an optional custom Ao-N (`customAoN`, default 25).
- `solveVisibility` mode controls how individual solves render (`muted`/`unmuted`/`dots`/
  `hidden`/`visible`).
- **Range selector**: `rangeMode` is `all` | `solveIndex` | `dateRange`; quick presets are
  All / Last 50 / 100 / 200 / First 100 / Last 7 Days / Last 30 Days, plus number inputs and
  sliders for solve-index ranges and date pickers for date ranges. Range bounds re-sync when
  the dataset changes.
- **Responsive ticks**: computes period boundary reference lines and downsamples their
  labels based on `windowWidth` to avoid overlap.
- A `CustomTooltip` shows time, penalties, scrambles, and the active period, and range stats
  (count, mean, best, % of total) are shown above the plot.
- **Gotcha**: the `regression` prop is destructured as `_regression` and **ignored**; the
  trend line is recomputed from the filtered range via `calculateLinearRegression`. The prop
  is kept for interface stability.

## `PbProgressionChart` (`PbProgressionChart.tsx`)

Step-down PB history chart. Props: `solves`, `groupingPeriod?`, `title?`.

- Calls `calculatePbProgression(solves)` (memoized) and plots running PBs for Single, Ao5,
  Ao12, Ao50, Ao100, each toggleable; optional raw-solve overlay.
- Y-bounds are computed only from the currently visible series.
- An expandable **milestone list** lists PB drops, filterable by `type` (`All`/`Single`/`Ao5`/…).
- `CustomTooltip` highlights solves that set a new PB.

## `DailyDistributionBoxPlot` (`DailyDistributionBoxPlot.tsx`)

A **hand-authored SVG** box-and-whisker plot (not Recharts). Props: `periodGroups`,
`groupingPeriod?`, `title?`.

- One box per `PeriodGroup` showing Q1/median/Q3, Tukey whiskers, outlier diamonds, and
  jittered individual solve dots (deterministic jitter via a `sin`-based hash of `solve.id`).
- Connects group medians with a dashed red "Median Trend" polyline annotated with values.
- Responsive: a `ResizeObserver` tracks container width (a `ResizeObserver` polyfill exists
  in `setupTests.tsx` for jsdom).
- X-axis tick density scales down automatically as the number of groups grows.
- Box colors interpolate from light sky to deep navy across the period progression.
- Hover tooltips on solve dots; accessible via `role="img"` and `aria-label`.

## `DensityShiftChart` (`DensityShiftChart.tsx`)

Recharts `AreaChart` of KDE curves. Props: `solves`, `groupingPeriod?`, `title?`.

- Uses `calculateKDE(solves, splitPercent, splitPercent, 120)` where `splitPercent` is one of
  `0.2` / `0.3` / `0.4` (baseline vs recent sample split).
- Plots `baselineDensity` (red) and `recentDensity` (green) areas.
- Computes a summary banner (baseline mean, recent mean, "faster by X" shift).

## `MetricsEvolutionChart` (`MetricsEvolutionChart.tsx`)

Recharts `ComposedChart` tracking consistency over periods. Props: `periodGroups`,
`groupingPeriod?`, `title?`.

- Per period plots Mean and Median (left time axis), a shaded Min–Max range band, and
  Standard Deviation (right axis, dashed).
- Titles/axis labels come from `getPeriodUnitInfo(groupingPeriod)`.

## `SolvesTable` (`SolvesTable.tsx`)

Paginated, searchable solve log. Props: `solves`.

- 15 rows/page; search matches index, time, date, or scramble (case-insensitive).
- Columns: `#`, Time (DNF / `+2` badges), Ao5, Ao12, Ao50, Ao100, Date, Scramble.
- Reset page to 1 on search change; empty-state row when nothing matches.

## `CubeLoadingSpinner` (`CubeLoadingSpinner.tsx`)

A decorative animated 3×3 cube built with `motion` (nine tiles with staggered
scale/opacity/rotate loops). Props: `size?: 'sm' | 'md' | 'lg'`. Used by `FileUploader`
during loading.

## Test conventions

Every component has a colocated `*.test.tsx` using React Testing Library. Query by visible
text or `data-testid`; interaction via `@testing-library/user-event` or `fireEvent`.
`ChartCardWrapper.test.tsx` mocks `html-to-image`. See
[`development.md`](./development.md) for shared harness details.
