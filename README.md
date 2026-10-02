# 🧩 Speedcubing Progression Analyzer

[![Test Runner](https://github.com/jjangsangy/CubeProgression/actions/workflows/test.yml/badge.svg)](https://github.com/jjangsangy/CubeProgression/actions/workflows/test.yml)
[![Deploy to GitHub Pages](https://github.com/jjangsangy/CubeProgression/actions/workflows/deploy.yml/badge.svg)](https://github.com/jjangsangy/CubeProgression/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/jjangsangy/CubeProgression/branch/main/graph/badge.svg)](https://codecov.io/gh/jjangsangy/CubeProgression)
[![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-v1.1+-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Biome](https://img.shields.io/badge/Code_Style-Biome-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)
[![csTimer](https://img.shields.io/badge/csTimer-Compatible-FF6B6B)](https://cstimer.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, high-performance web application built for speedcubers to analyze **csTimer** session logs. Gain deep insights into your solve time progression, rolling averages, session variance, probability density shifts, and personal record timelines.

---

## ✨ Key Features

- **📂 csTimer Import & Multi-Session Support**: Seamlessly upload csTimer `.txt` or `.json` session export files with automatic multi-session detection, or explore immediately with the built-in **350-solve sample dataset**.
- **📊 Overview Metrics**: Real-time summary cards displaying Best Single, Best ao5, Best ao12, Global Mean, Total Solves count, and DNF percentage.
- **📈 Progression & Moving Averages**: Time-series visualization tracking individual solve times alongside rolling averages (**ao5**, **ao12**, **ao50**, and **ao100**).
- **🏆 Personal Best (PB) Timeline**: Dedicated step chart tracing the history of single and average personal bests over time.
- **📦 Distribution Box Plots**: Statistical box-and-whisker plots revealing session median, interquartile range (IQR), min/max times, and outliers grouped by **day**, **week**, **month**, or **custom batch size**.
- **🌊 Density Shift Chart**: Kernel density estimation (KDE) chart comparing solve distributions between early session phases (warm-up) and later phases (fatigue/peak).
- **📉 Metrics Evolution**: Track time-series consistency and variance metrics like Standard Deviation and Interquartile Range over session history.
- **📋 Interactive Solves Table**: Paginated, filterable table listing every solve with scramble details, timestamps, penalties (+2 / DNF), and search capabilities.
- **💾 IndexedDB Persistence**: Automatically preserves imported sessions, active view settings, and solve data locally in the browser so your analysis persists across reloads.
- **📸 High-Resolution PNG & CSV Export**: Download crisp PNG snapshots of any analytical chart with one click or export period summary statistics as CSV.
- **🔍 Fullscreen Modal Mode**: Expand any chart into an immersive modal for granular data exploration.

---

## 🛠️ Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Framework**: [React 19](https://react.dev/) + [TypeScript 7](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vite.dev/) (via `@tailwindcss/vite` & `@vitejs/plugin-react`)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)
- **Charts & Statistics**: [Recharts 3](https://recharts.org/), [D3.js](https://d3js.org/)
- **Storage & Offline Persistence**: Native browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Snapshot & Export**: [html-to-image](https://github.com/bubkoo/html-to-image) for high-resolution PNG chart downloads and CSV export
- **Linter & Formatter**: [Biome 2](https://biomejs.dev/)
- **Testing**: [Vitest 5](https://vitest.dev/), [React Testing Library](https://testing-library.com/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [**Bun**](https://bun.sh/) (v1.1 or higher) installed on your system.

### Installation

1. Clone or download the repository.
2. Install dependencies:

```bash
bun install
```

### Development Server

Start the local development server:

```bash
bun run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Type-Checking, Linting & Formatting

Run TypeScript type-checking:

```bash
bun run typecheck
```

Check code quality and formatting with [Biome](https://biomejs.dev/):

```bash
bun run check
```

Automatically apply formatting and safe lint fixes:

```bash
bun run check:write
```

To run formatting or linting specifically:

```bash
bun run format      # format code
bun run lint        # check lint rules
bun run lint:fix    # fix lint issues
```

### Running Tests

Run the test suite powered by [Vitest](https://vitest.dev/):

```bash
bun run test
```

To run tests with code coverage reporting (via `@vitest/coverage-v8`):

```bash
bun run test:coverage
```

Continuous integration runs on GitHub Actions across Linux, macOS, and Windows with coverage reports automatically uploaded to [Codecov](https://codecov.io/gh/jjangsangy/CubeProgression).

### Production Build

Build the production distribution bundle with [Vite 8](https://vite.dev/):

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

---

## 📥 How to Export Data from csTimer

1. Open [csTimer.net](https://cstimer.net/).
2. Click on **Option** / **Export** in the top navigation bar.
3. Select **Export to file**.
4. Upload the generated `.txt` or `.json` file into the Speedcubing Progression Analyzer.

---

## 📁 Project Structure

```
├── src/
│   ├── components/                   # React UI components
│   │   ├── ChartCardWrapper.tsx      # Card container with PNG download & fullscreen modal
│   │   ├── CubeLoadingSpinner.tsx    # Animated Rubik's cube loading indicator
│   │   ├── DailyDistributionBoxPlot.tsx # Box plot visualizer (day, week, month, batch)
│   │   ├── DensityShiftChart.tsx     # Kernel density estimation (KDE) plot
│   │   ├── FileUploader.tsx          # Drag-and-drop csTimer session import
│   │   ├── MetricsEvolutionChart.tsx # Variance & consistency tracker (Std Dev, IQR)
│   │   ├── MetricsOverviewCards.tsx  # Summary KPIs (Single, ao5, ao12, Mean, DNF%)
│   │   ├── Navbar.tsx                # Header with storage stats, demo load, CSV export
│   │   ├── PbProgressionChart.tsx    # PB history step chart
│   │   ├── ProgressionChart.tsx      # Main solves + moving averages chart
│   │   └── SolvesTable.tsx           # Paginated, searchable solve details table
│   ├── utils/
│   │   ├── csTimerParser.ts          # csTimer export file format decoder (.txt & .json)
│   │   ├── dbStorage.ts              # IndexedDB persistence & storage estimate helpers
│   │   ├── sampleData.ts             # Sample 350-solve dataset generator
│   │   └── statsMath.ts              # Rolling average, IQR, KDE & statistical helpers
│   ├── App.tsx                       # Main application state & dashboard layout
│   ├── main.tsx                      # React root entry point
│   ├── setupTests.tsx                # Vitest & Testing Library test configuration
│   ├── types.ts                      # TypeScript interfaces & domain types
│   ├── vite-env.d.ts                 # Vite client type definitions
│   └── index.css                     # Tailwind CSS v4 styling entry point
├── biome.json                        # Biome linter and formatter configuration
├── bun.lock                          # Bun lockfile
├── package.json                      # Dependencies and npm/bun scripts
├── tsconfig.json                     # TypeScript compiler configuration
└── vite.config.ts                    # Vite 8 configuration with Tailwind & Vitest
```

---

## 📄 License

MIT License. Feel free to use and adapt for your own speedcubing statistics projects!
