export type ThemeMode = 'dark' | 'light';

/**
 * The data that defines a theme minus its identifier. The registry key is the
 * theme's id, so a palette never repeats its own name.
 */
export interface ThemeSpec {
  name: string;
  mode: ThemeMode;
  description: string;
  colors: ThemePalette;
}

/**
 * A theme's essence: its surfaces, text, a single brand accent, and one shared
 * data-series palette every chart draws from. Chart chrome (grid, axes,
 * tooltips) and tonal variants are derived from these, so a theme only lists
 * each color once.
 */
export interface ThemePalette {
  bgApp: string;
  bgCard: string;
  bgSubtle: string;
  bgHover: string;

  border: string;
  borderSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentHover: string;
  /** Translucent accent wash, e.g. `rgba(…, 0.15)`. */
  accentMuted: string;
  accentText: string;

  /** Box-plot fill gradient endpoints. */
  boxGradient: {
    start: string;
    end: string;
  };

  /** Categorical colors shared by every chart. */
  series: {
    neutral: string;
    green: string;
    orange: string;
    blue: string;
    purple: string;
    amber: string;
    red: string;
    teal: string;
  };
}
