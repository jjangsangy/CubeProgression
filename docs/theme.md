# Color Architecture & Theming Guide

This document catalogs all color storage and usage across **CubeProgression**, details the
centralized theme system, and outlines how themes (including 7 light modes and 8 dark palettes, 15 total)
are defined, referenced, and extended.

---

## 1. Color Inventory & Audit Synthesis

> Historical note: this section records the **pre-theming** inventory of hardcoded colors that
> existed before the centralized theme system was introduced. Those literals have since been
> replaced by the theme tokens described in sections 2 and 3; treat the hex values below as the
> audit baseline that motivated the refactor, not as the current source of truth.

A codebase audit across all UI components, progression charts, distribution charts, global
stylesheets, and application configs identified the following color roles:

### A. Progression & PB Progression Charts
- **Progression Chart Series**:
  - `Single`: `#94a3b8` (line/dot unmuted), `#cbd5e1` (dot fill), `#64748b` (stroke muted), `#38bdf8` (active dot fill).
  - `Ao5`: `#22c55e` (green-500).
  - `Ao12`: `#f97316` (orange-500).
  - `Ao50`: `#0284c7` (sky-600).
  - `Ao100`: `#a855f7` (purple-500).
  - `Custom Ao`: `#eab308` (yellow-500).
  - `OLS Trend Line`: `#e11d48` (rose-600).
- **PB Progression Chart Series**:
  - `Raw Solves`: `#64748b` (line/dot), `#94a3b8` (active dot).
  - `PB Single`: `#f59e0b` (amber-500).
  - `PB Ao5`: `#f97316` (orange-500).
  - `PB Ao12`: `#06b6d4` (cyan-500).
  - `PB Ao50`: `#8b5cf6` (violet-500).
  - `PB Ao100`: `#10b981` (emerald-500).
- **Cartesian Grid & Axes**:
  - Gridlines: `#334155` (slate-700).
  - Axis labels/ticks: `#94a3b8` (slate-400).
  - Axis baseline: `#475569` (slate-600).
  - Period boundary lines: `#64748b`, labels: `#cbd5e1`.

### B. Distribution & Metric Charts
- **Daily Distribution Box Plot (`DailyDistributionBoxPlot.tsx`)**:
  - Dynamic gradient box fill: Linear RGB interpolation from `#dbeafe` (sky-100) to `#1e3a8a` (blue-900).
  - Whiskers & caps: `#64748b`.
  - Box border: `#1e293b`.
  - Median indicator mark: `#0f172a`.
  - Jittered solve scatter dots: fill `#64748b`, stroke `#f8fafc`.
  - Outliers: diamond fill `#ef4444`, stroke `#0f172a`.
  - Median trend polyline & circles: `#ef4444`, circle border `#ffffff`.
- **Density Shift KDE Chart (`DensityShiftChart.tsx`)**:
  - Baseline distribution curve & gradient area: `#ef4444` (red-500).
  - Recent distribution curve & gradient area: `#22c55e` (green-500).
  - Baseline peak reference line & callout: `#ef4444`, text `#fca5a5`.
  - Recent peak reference line & callout: `#22c55e`, text `#86efac`.
  - Peak distance delta line & callout: `#f59e0b`, text `#fbbf24`.
  - Scrubber timeline sparkline area: `#38bdf8`, line `#64748b`, mean `#52525b`, boundary `#94a3b8`.
- **Metrics Evolution Chart (`MetricsEvolutionChart.tsx`)**:
  - Mean line & data points: `#0284c7` (sky-600), point border `#ffffff`.
  - Median line & data points: `#f97316` (orange-500), point border `#ffffff`.
  - Std Dev line & data points: `#22c55e` (green-500), point fill `#15803d`, stroke `#4ade80`.
  - Min-Max Range area fill: gradient from `#14b8a6` (teal-500) to `#0d9488` (teal-600).
- **Chart Card Wrapper (`ChartCardWrapper.tsx`)**:
  - PNG export canvas background: `#0c0a09` (stone-950).

### C. UI & Layout Components
- **Surfaces & Cards**: `stone-950` (page canvas `#0c0a09`), `stone-900` (card surface `#1c1917`), `stone-800` (subtle surfaces / inputs / inactive controls).
- **Borders & Dividers**: `stone-800` (`#292524`), `stone-700` (`#44403c`).
- **Typography**: `stone-100` (`#f5f5f4`, primary), `stone-300` / `stone-400` (`#a8a29e`, secondary), `stone-500` (`#78716c`, muted).
- **Brand & Accents**: Amber (`amber-500` `#f59e0b`, `amber-400` `#fbbf24`), Emerald (`emerald-400` `#34d399`), Rose (`rose-400` `#fb7185`).
- **Cube Spinner Tiles (`CubeLoadingSpinner.tsx`)**:
  - 3x3 Rubik's cube sticker faces: Amber (`#fbbf24`, `#fcd34d`), Emerald (`#34d399`, `#10b981`), Sky (`#38bdf8`, `#0284c7`), Orange (`#f97316`, `#fb923c`), Rose (`#f43f5e`).

### D. Global Styles, App Shell & Manifest
- **Root Styles (`src/index.css`)**: `background-color: #0c0a09; color: #f5f5f4;`.
- **HTML Shell (`index.html`)**: `<meta name="theme-color" content="#0c0a09" />`, `<meta name="color-scheme" content="dark" />`.
- **PWA Manifest (`public/manifest.webmanifest`)**: `background_color: "#0c0a09"`, `theme_color: "#0c0a09"`.

---

## 2. Centralized Theme System Architecture

Colors are no longer hardcoded across individual components. Instead, they are defined in a
single centralized location:

```
src/theme/
├── types.ts          # Theme mode, palette, and ThemeSpec interfaces
├── themes.ts         # THEME_SPECS registry (single source of truth) + derived ThemeId/THEMES
├── ThemeContext.tsx  # React Context, Provider, and useTheme() hook
└── index.ts          # Unified module exports
```

### CSS Architecture & Dynamic Token Application (`src/index.css` & `ThemeContext.tsx`)

To avoid brittle, repetitive CSS files with duplicate hex codes, the theming engine uses a clean,
single-source-of-truth architecture:

1. **Single Source of Truth (`src/theme/themes.ts`)**:
   All surface colors (`bgApp`, `bgCard`, `bgSubtle`, `border`, `borderSubtle`, etc.) and
   data-series tokens are defined in typed TypeScript objects.
2. **Dynamic Injection (`ThemeContext.tsx`)**:
   When a theme is activated, `applyThemeToDocument` dynamically injects the surface CSS variables
   (`--color-stone-950`, `--color-stone-900`, etc.) onto `document.documentElement`, syncs
   `data-theme`, `data-theme-mode`, and `color-scheme`.
3. **Semantic Mode Styles (`src/index.css`)**:
   `src/index.css` is concise and maintainable. It defines the default dark surface tokens on
   `:root` and the light surface scale plus a softer card elevation shadow under
   `[data-theme-mode="light"]`. The accent and data-series palettes are injected dynamically by
   `applyThemeToDocument` (see below), not hardcoded in CSS.

### JavaScript Theme Tokens & Recharts Profiles

Charts rendered with Recharts and hand-authored SVG receive live theme tokens via `useTheme()`:
```ts
const { theme, mode, isLight, colors } = useTheme();

// Example usage in Recharts / SVG:
<CartesianGrid stroke={colors.borderSubtle} />
<XAxis stroke={colors.textMuted} />
<Line stroke={colors.series.orange} />
```

Each theme provides a tailored Recharts color profile:
- **Light themes**: Deeply saturated, high-contrast lines (`#059669`, `#ea580c`, `#2563eb`, `#7c3aed`),
  crisp tooltips with light card backgrounds and dark text, clean slate axes, and distinct KDE
  density curves (e.g. sapphire baseline vs emerald recent in Clean Slate; terracotta vs solarized blue in Solarized Light).
- **Dark themes**: Luminous, vibrant neon series with dark tooltips and high-contrast markers.
- **KDE Plot Theming**: Curves, gradient fills, timeline scrubbers, sparklines, and mean shift banners
  are fully synchronized with `colors.series.*` instead of hardcoded red/green.

---

## 3. The 15 Available Themes

The theme system organizes 15 cohesive themes categorized by mode:

### Dark Themes (8)
| Theme ID | Name | Mode | Description |
| :--- | :--- | :--- | :--- |
| `dark` | **Obsidian (Default)** | Dark | The classic dark stone theme with vibrant neon cube accents. |
| `wca` | **WCA Competition** | Dark | Inspired by official World Cube Association blue and royal accents. |
| `cyberpunk` | **Cyberpunk Neon** | Dark | High-voltage neon magenta, cyan, and deep purple obsidian. |
| `gan-mint` | **GAN Mint** | Dark | Sleek, modern Arctic mint & teal speedcube aesthetic. |
| `retro` | **Retro 1980s** | Dark | Classic warm charcoal with vintage Rubik's primary sticker colors. |
| `monokai` | **Monokai Pro** | Dark | Syntax-inspired dark olive slate with yellow, green, and pink tones. |
| `solarized-dark`| **Solarized Dark** | Dark | Precision Ethan Schoonover solarized cyan & deep teal palette. |
| `sunset` | **Plum Sunset** | Dark | Rich dark plum and coral rose with warm golden sunset hues. |

### Light Themes (7)
| Theme ID | Name | Mode | Description |
| :--- | :--- | :--- | :--- |
| `light` | **Clean Slate** | Light | High-contrast, clean white canvas with rich sapphire, emerald, and coral lines. |
| `solarized-light`| **Solarized Light** | Light | Warm ivory paper canvas with deep Ethan Schoonover solarized typography & contrast. |
| `nord-light` | **Nord Frost** | Light | Cool arctic snow canvas with vibrant glacial tones. |
| `rose-pine-dawn` | **Rose Pine Dawn** | Light | Warm botanical parchment with tea rose, eucalyptus pine, and golden sunlight. |
| `mint-light` | **Garden Mint** | Light | Fresh botanical matcha and spearmint canvas with deep forest typography. |
| `latte` | **Catppuccin Latte** | Light | Soothing pastel palette with lavender, peach, and sapphire. |
| `tokyo-night-day` | **Tokyo Night Day** | Light | High-clarity Japanese cityscape theme with cobalt blue and cyan. |

---

## 4. Theme Selector & Persistence

The theme selector is located in the top navigation bar (`Navbar.tsx`):
- Provides an accessible dropdown anchored with ID `#theme-selector`.
- Groups themes into **Dark Themes** (with Moon icon) and **Light Themes** (with Sun icon).
- Displays the current theme name, color swatches, and full list of available themes.
- Automatically saves choice to `localStorage` key `'cubeprogression_theme'`.
- Synchronizes with:
  1. `<html data-theme="..." data-theme-mode="...">`
  2. `<meta name="theme-color" content="...">` for native mobile browser frame tinting.
  3. Dynamic PNG chart export background in `ChartCardWrapper`.

---

## 5. Adding or Modifying a Theme

To add or adjust a theme:
1. Open `src/theme/themes.ts`.
2. Add or modify an entry in the `THEME_SPECS` registry, conforming to `ThemeSpec`
   (`src/theme/types.ts`). The registry key becomes the theme id automatically — `ThemeId` is derived
   from the keys, so there is no separate union to update.
3. Because surfaces and Recharts colors are dynamically bound from `theme.colors`, no CSS edits are required for new themes unless introducing special theme-specific utility classes.
4. Run `bun run check:write` and `bun run test` to verify formatting and validation.
