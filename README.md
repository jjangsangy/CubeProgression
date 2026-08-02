# 🧩 Speedcubing Progression Analyzer

A modern, high-performance web application built for speedcubers to analyze **csTimer** session logs. Gain deep insights into your solve time progression, rolling averages, session variance, probability density shifts, and personal record timelines.

---

## ✨ Key Features

- **📂 csTimer Import**: Seamlessly upload csTimer `.txt` or `.json` session export files, or explore immediately with the built-in **350-solve sample dataset**.
- **📊 Overview Metrics**: Real-time summary cards displaying Best Single, Best ao5, Best ao12, Global Mean, Total Solves count, and DNF percentage.
- **📈 Progression & Moving Averages**: Time-series visualization tracking individual solve times alongside rolling averages (**ao5**, **ao12**, **ao50**, and **ao100**).
- **🏆 Personal Best (PB) Timeline**: Dedicated step chart tracing the history of single and average personal bests over time.
- **📦 Distribution Box Plots**: Statistical box-and-whisker plots revealing session median, interquartile range (IQR), min/max times, and outliers grouped by **day**, **week**, **month**, or **custom batch size**.
- **🌊 Density Shift Chart**: Kernel density estimation (KDE) chart comparing solve distributions between early session phases (warm-up) and later phases (fatigue/peak).
- **📉 Metrics Evolution**: Track time-series consistency and variance metrics like Standard Deviation and Interquartile Range over session history.
- **📋 Interactive Solves Table**: Paginated, filterable table listing every solve with scramble details, timestamps, penalties (+2 / DNF), and search capabilities.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)
- **Charts & Statistics**: [Recharts](https://recharts.org/), [D3.js](https://d3js.org/)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18 or higher) and **npm** installed on your system.

### Installation

1. Clone or download the repository.
2. Install dependencies:

```bash
npm install
```

### Development Server

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Running Tests

Run the test suite powered by Vitest:

```bash
npm run test
```

To run tests with coverage reporting:

```bash
npm run test:coverage
```

### Production Build

Build the production distribution bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
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
│   ├── components/                # React UI components
│   │   ├── ChartCardWrapper.tsx   # Common container for analytical charts
│   │   ├── CubeLoadingSpinner.tsx # Rubik's cube loading animation
│   │   ├── DailyDistributionBoxPlot.tsx # Box plot visualizer
│   │   ├── DensityShiftChart.tsx  # Kernel density estimation plot
│   │   ├── FileUploader.tsx       # Drag-and-drop file import
│   │   ├── MetricsEvolutionChart.tsx # Variance/STD EV tracker
│   │   ├── MetricsOverviewCards.tsx  # Summary KPIs
│   │   ├── Navbar.tsx             # Application header & controls
│   │   ├── PbProgressionChart.tsx # PB history step chart
│   │   ├── ProgressionChart.tsx   # Main solves + moving averages chart
│   │   └── SolvesTable.tsx        # Paginated solve details table
│   ├── utils/
│   │   ├── csTimerParser.ts       # csTimer export file format decoder
│   │   ├── sampleData.ts          # Sample 350-solve dataset generator
│   │   └── statsMath.ts           # Rolling average, IQR, KDE & stat helpers
│   ├── App.tsx                    # Main application container
│   ├── types.ts                   # TypeScript interfaces & types
│   └── index.css                  # Tailwind CSS styling entry point
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite setup
```

---

## 📄 License

MIT License. Feel free to use and adapt for your own speedcubing statistics projects!
