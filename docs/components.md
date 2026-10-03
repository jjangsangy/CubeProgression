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
- Statically renders Plot 1 (`ProgressionChart`) with synchronous shell/controls, while below-the-fold visualizations are code-split and wrapped in `<DeferredChart>` with calibrated minimum heights (640px PB, 550px Box Plot, 550px Density Shift, 525px Metrics Evolution, 780px Solves Table) ensuring **CLS = 0.000**.
- Enables isolated testing of the entire progression visualization grid without mounting dataset storage hooks.

## `DeferredChart` (`DeferredChart.tsx`)

Viewport-aware wrapper that delays mounting heavy visualization components until they scroll near the viewport. Props: `minHeight`, `fallbackTitle?`, `children`.

- Uses `IntersectionObserver` with a `250px` root margin to trigger pre-emptive rendering before coming into view.
- Latches mounted state permanently once visible; disconnects observer immediately.
- Encloses children in an internal `<Suspense>` boundary displaying an animated skeleton loader with responsive padding (`p-4 sm:p-6`) matching `ChartCardWrapper`.
- Applies `.chart-content-visibility` (`content-visibility: auto`) with dynamic `containIntrinsicSize: auto [minHeight]` to avoid off-screen layout work without content jumping.
- Automatically falls back to synchronous rendering in jsdom or browsers lacking `IntersectionObserver`.

## `Footer` (`Footer.tsx`)

Presentational footer component with safe-area styling (`safe-area-x safe-area-bottom`).

## `Navbar` (`Navbar.tsx`)

Top header. Props: `fileName`, `onReset`, `isSaved`,
`storageUsageMB`, `onClearStorage`, `canInstall`, `onInstall`, `isOnline`, `onOpenInstructions`.

- Brand block with visible title + "csTimer Analytics" badge.
- Shows a green "Saved locally (N MB)" pill when `isSaved`, and a file-name chip on larger screens.
- Buttons: **csTimer Guide** (when modal handler provided) and a reset control that becomes a
  destructive "clear storage" (trash) icon once data is saved.

## `FileUploader` (`FileUploader.tsx`)

The upload + configuration panel.

- Drag-and-drop **and** click-to-browse dropzone (`accept=".txt,.json"`). Disabled while loading.
- Props include `sessions`, `selectedSessionId`, `onSelectSession`, grouping controls
  (`groupingPeriod`, `onChangeGrouping`, `customBatchSize`, `onChangeCustomBatchSize`),
  `onFileUpload`, `onLoadDemo`, `errorMsg`, and the loading/storage props.
- Renders group-by buttons (Day / Week / Month / Batch-50 / Custom batch) and a session
  selector when multiple sessions exist.
- When `isLoading`, renders `CubeLoadingSpinner`, an accessible progress bar, `loadingStage` status,
  and an isolated `LoadingElapsedTimer`. Uses hardware-accelerated CSS transitions without runtime motion libraries.

## `LoadingElapsedTimer` (`LoadingElapsedTimer.tsx`)

Leaf component isolating the active loading elapsed timer display.

- Updates at a throttled 250ms cadence (4 Hz), reducing main-thread timer interrupts by 86% compared to sub-frame tick loops.
- Localizes timer state to avoid re-rendering the parent `FileUploader` component during dataset imports.

## `ChartCardWrapper` (`ChartCardWrapper.tsx`)

Shared wrapper for every chart. Props: `title`, `subtitle?`, `children`, `headerBadge?`,
`headerControls?`, `filenamePrefix?`.

- Header with badge + title, optional subtitle, optional controls row, and a
  `export-exclude` action cluster (PNG download, maximize).
- **Fullscreen**: renders in a React Portal (`createPortal(..., document.body)`) to prevent
  collapsing parent grid tracks; closes on `Escape` and locks body scroll.
- **PNG export**: dynamically imports `html-to-image` on demand. Measures true unclipped
  size, calls `toPng` with `pixelRatio: 2` and `skipFonts: true`, retrying with `pixelRatio: 1`
  or falling back to `toCanvas`. Pins live SVG dimensions during clone.
- `triggerBlobDownload` converts base64 data URLs to `Blob` objects for reliable cross-origin downloads.

> If you add a new chart, wrap it in this component so it inherits export + fullscreen.

## `MetricsOverviewCards` (`MetricsOverviewCards.tsx`)

Five summary KPI cards from `GlobalStats`: Best Single, Best Averages (Ao12/Ao50), Overall
Rate (regression slope), Progression Gain (baseline vs recent delta + %), and Session Solves
(total + DNFs + mean). Purely display.

## `ProgressionChart` (`src/components/progression/ProgressionChart.tsx`)

The main time-series chart (Recharts `ComposedChart`). Props: `solves`, `periodGroups`,
`regression`, `groupingPeriod?`, `title?`. Modularized with `ProgressionChartCanvas` and `progressionMath`.

- Decouples Recharts execution from initial paint: the outer shell, card wrapper, title, badges, metric toggles, and range slider render synchronously on Frame 0 with an exact 420px canvas skeleton, while `ProgressionChartCanvas` mounts during idle time via `requestIdleCallback` (or immediately in tests/JSDOM).
- Disables non-composited SVG animations (`isAnimationActive={false}`) across all lines for instant scrubbing and mobile responsiveness.
- Adds numeric `interval` on `<XAxis>` to bypass Recharts `DOMUtils.js:54` text measurement, completely eliminating the 29 ms forced reflow.
- Sets explicit `initialDimension={{ width: 800, height: 420 }}` on `ResponsiveContainer`, preventing the 32 ms layout recalculation during effect flushes.
- Plots individual solve times (`single`) plus toggleable moving averages `ao5`/`ao12`/
  `ao50`/`ao100`, a trend line, and an optional custom Ao-N (`customAoN`, default 25).
- Uses $O(N)$ hash-map indexing in `buildProgressionChartData` to eliminate quadratic lookup overhead during range filtering.
- Lazily initializes mobile breakpoint checks to prevent double-mount render passes.
- `solveVisibility` mode controls how individual solves render (`muted`/`unmuted`/`dots`/
  `hidden`/`visible`).
- **Range selector**: `rangeMode` is `all` | `solveIndex` | `dateRange`; quick presets are
  All / Last 50 / 100 / 200 / First 100 / Last 7 Days / Last 30 Days.
- **Responsive ticks**: computes period boundary reference lines and downsamples their
  labels based on screen width.

## `PbProgressionChart` (`PbProgressionChart.tsx`)

Step-down PB history chart. Props: `solves`, `groupingPeriod?`, `title?`.

- All 6 lines render with `isAnimationActive={false}` to eliminate CPU-bound animation loops.
- Calls `calculatePbProgression(solves)` (memoized) and plots running PBs for Single, Ao5,
  Ao12, Ao50, Ao100, each toggleable; optional raw-solve overlay.
- Y-bounds and filtered milestones are isolated with fine-grained `useMemo` hooks so UI toggles never trigger stats recalculations.
- An expandable **milestone list** lists PB drops, filterable by `type` (`All`/`Single`/`Ao5`/…).
- `CustomTooltip` highlights solves that set a new PB.

## `DailyDistributionBoxPlot` (`DailyDistributionBoxPlot.tsx`)

A **hand-authored SVG** box-and-whisker plot (zero Recharts overhead). Props: `periodGroups`,
`groupingPeriod?`, `title?`.

- One box per `PeriodGroup` showing Q1/median/Q3, Tukey whiskers, outlier diamonds, and
  jittered individual solve dots.
- Pure CSS hover states on scatter dots replace heavy JavaScript event bindings.
- Eliminated synchronous DOM measurements on mount in favor of asynchronous `ResizeObserver`.
- Responsive: tracks container width without forced reflows.
- Box colors interpolate from light sky to deep navy across the period progression.
- Accessible via `role="img"` and `aria-label`.

## `DensityShiftChart` (`DensityShiftChart.tsx`)

Full-width Recharts `AreaChart` of KDE curves with an interactive solve timeline track and dual scrubbers. Props: `solves`, `groupingPeriod?`, `periodGroups?`, `customBatchSize?`, `title?`.

- Disables non-composited SVG animations (`isAnimationActive={false}`) on baseline and recent areas.
- Uses `calculateKDEFromSamples(sample1Solves, sample2Solves, 120, globalDomain)` to compute probability density curves between any two sampled subsets over an anchored session-wide domain to prevent X-axis jitter.
- Normalizes Y-axis ceiling dynamically (`getNormalizedYCeiling`) so peaks comfortably fill ~75-80% of chart height regardless of sample size or clustering, preventing peaks from being too small (flat) or too large (clipping).
- Plots `baselineDensity` (red/rose) and `recentDensity` (green/emerald) areas.
- Detects the dominant peak solve time of each sample curve using `findKDEPeak` with sub-grid parabolic interpolation and renders dashed vertical `ReferenceLine` markers displaying off-center peak solve times (e.g. `11.24s`, positioned off-center so the vertical line does not cut through the text), automatically staggering label heights when peaks cluster closely to prevent text overlap.
- Connects the dominant peaks with a dotted horizontal amber distance bar (`#f59e0b`, `strokeDasharray="3 3"`, `ReferenceLine segment`) spanning between the two peak positions at the peak apex height, displaying the absolute distance between them (e.g. `1.00s`) via a centered label positioned above the line.
- Features dual draggable scrubbers with semi-transparent opacity (`bg-rose-500/25` and `bg-emerald-500/25`) placed on an interactive dataset timeline track below the chart with responsive height scaling across mobile, tablet, and desktop viewports (`h-12 sm:h-14 md:h-16 lg:h-20`).
- Each scrubber features ribbed resize handles on both ends (`cursor-ew-resize`) allowing users to drag the ends left or right to dynamically increase or decrease the sample window width. Dragging the center body slides the window along the timeline.
- The scrubber track features an SVG sparkline, mean reference line, and vertical dashed grouping boundary lines showing where aggregation periods (e.g. daily/weekly sessions, batches) begin and end.
- Computes a centered, evenly distributed summary banner (baseline mean, recent mean, solve index ranges, and "faster/slower by X" shift).

## `MetricsEvolutionChart` (`MetricsEvolutionChart.tsx`)

Recharts `ComposedChart` tracking consistency over periods. Props: `periodGroups`,
`groupingPeriod?`, `title?`.

- Disables SVG animations (`isAnimationActive={false}`) across line and range area series.
- Per period plots Mean and Median (left time axis), a shaded Min–Max range band, and
  Standard Deviation (right axis, dashed).
- Titles/axis labels come from `getPeriodUnitInfo(groupingPeriod)`.

## `SolvesTable` (`SolvesTable.tsx`)

Paginated, searchable solve log. Props: `solves`.

- 15 rows/page; search matches index, time, date, or scramble (case-insensitive).
- Uses `table-fixed min-w-[680px]` with reserved container min-height (`min-h-[460px]`) to eliminate column recalculation reflows and prevent layout shift during pagination.
- Columns: `#`, Time (DNF / `+2` badges), Ao5, Ao12, Ao50, Ao100, Date, Scramble.
- Reset page to 1 on search change; empty-state row when nothing matches.

## `CubeLoadingSpinner` (`CubeLoadingSpinner.tsx`)

A decorative 3×3 animated cube styled with hardware-accelerated CSS keyframe animations. Props: `size?: 'sm' | 'md' | 'lg'`.

- Replaced JavaScript runtime animation loops with CSS `@keyframes` (`cube-tile-cw` / `cube-tile-ccw`) and `transform: translateZ(0)`.
- Eliminates excess GPU compositing layer memory during file processing.
- Full support for `prefers-reduced-motion` media queries and semantic `role="status"` accessibility.

## Test conventions

Every component has a colocated `*.test.tsx` using React Testing Library. Query by visible
text or `data-testid`; interaction via `@testing-library/user-event` or `fireEvent`.
`ChartCardWrapper.test.tsx` mocks `html-to-image`. See
[`development.md`](./development.md) for shared harness details.
