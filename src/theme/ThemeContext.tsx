import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  darkTheme,
  getTheme,
  THEMES,
  THEMES_LIST,
  type ThemeDefinition,
  type ThemeId,
} from './themes';
import type { ThemePalette } from './types';

export interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  mode: 'dark' | 'light';
  isDark: boolean;
  isLight: boolean;
  colors: ThemePalette;
  availableThemes: ThemeDefinition[];
  setTheme: (id: ThemeId) => void;
}

const STORAGE_KEY = 'cubeprogression_theme';

const defaultContextValue: ThemeContextValue = {
  themeId: 'dark',
  theme: darkTheme,
  mode: 'dark',
  isDark: true,
  isLight: false,
  colors: darkTheme.colors,
  availableThemes: THEMES_LIST,
  setTheme: () => {},
};

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

function getInitialThemeId(): ThemeId {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in THEMES) {
      return saved as ThemeId;
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return 'dark';
}

function applyThemeToDocument(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-mode', theme.mode);
  root.style.colorScheme = theme.mode;

  // Paint the window canvas (html/body letterbox & overscroll area) from the theme.
  // index.html ships a dark inline background to avoid a white flash on first paint;
  // this inline value overrides it once the active theme is known.
  root.style.backgroundColor = theme.colors.bgApp;
  if (document.body) {
    document.body.style.backgroundColor = theme.colors.bgApp;
  }

  // Dynamically set semantic surface variables from the single theme definition
  root.style.setProperty('--color-stone-950', theme.colors.bgApp);
  root.style.setProperty('--color-stone-900', theme.colors.bgCard);
  root.style.setProperty(
    '--color-stone-800',
    theme.mode === 'light' ? theme.colors.border : theme.colors.bgSubtle,
  );
  root.style.setProperty('--color-stone-700', theme.colors.border);
  root.style.setProperty('--color-stone-600', theme.colors.borderSubtle);
  root.style.setProperty('--color-stone-500', theme.colors.textMuted);
  root.style.setProperty('--color-stone-400', theme.colors.textMuted);
  root.style.setProperty('--color-stone-300', theme.colors.textSecondary);
  root.style.setProperty('--color-stone-200', theme.colors.textSecondary);
  root.style.setProperty('--color-stone-100', theme.colors.textPrimary);

  // Dynamic accent tokens from theme definition
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-accent-hover', theme.colors.accentHover);
  root.style.setProperty('--color-accent-muted', theme.colors.accentMuted);
  root.style.setProperty('--color-accent-text', theme.colors.accentText);
  root.style.setProperty('--color-border-focus', theme.colors.accent);

  // Drive Tailwind's shared palette variables from the active theme so utility
  // classes used across the app (text-amber-400, bg-emerald-500/10,
  // hover:text-amber-300, selection:bg-amber-500/30, …) follow *every* theme —
  // not just light vs. dark. Accent families mirror the brand accent; the rest
  // mirror the shared data-series palette.
  const { series } = theme.colors;
  const familyColors: Record<string, string> = {
    amber: theme.colors.accent,
    yellow: series.amber,
    orange: series.orange,
    emerald: series.green,
    green: series.green,
    lime: series.green,
    teal: series.teal,
    cyan: series.teal,
    sky: series.blue,
    blue: series.blue,
    indigo: series.purple,
    violet: series.purple,
    purple: series.purple,
    fuchsia: series.purple,
    pink: series.red,
    rose: series.red,
    red: series.red,
  };
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  for (const [family, value] of Object.entries(familyColors)) {
    for (const shade of shades) {
      root.style.setProperty(`--color-${family}-${shade}`, value);
    }
  }
  // Keep the amber ramp's hover/text shades distinct from the base accent.
  root.style.setProperty('--color-amber-400', theme.colors.accentHover);
  root.style.setProperty('--color-amber-300', theme.colors.accentText);
  root.style.setProperty('--color-amber-200', theme.colors.accentText);

  // Sync theme-color meta tag for mobile browser frame
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme.colors.bgApp);
  }
}

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeId;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(() => initialTheme ?? getInitialThemeId());

  const currentTheme = useMemo(() => getTheme(themeId), [themeId]);

  const handleSetTheme = useCallback((id: ThemeId) => {
    if (id in THEMES) {
      setThemeId(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: currentTheme,
      mode: currentTheme.mode,
      isDark: currentTheme.mode === 'dark',
      isLight: currentTheme.mode === 'light',
      colors: currentTheme.colors,
      availableThemes: THEMES_LIST,
      setTheme: handleSetTheme,
    }),
    [themeId, currentTheme, handleSetTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? defaultContextValue;
}
