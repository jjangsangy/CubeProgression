import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';
import { darkTheme, getTheme, THEMES, THEMES_LIST, type ThemeId } from './themes';

describe('ThemeContext and ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.removeAttribute('data-theme-mode');
    root.removeAttribute('style');
    root.className = '';
  });

  it('defines a unique, structurally complete theme registry', () => {
    expect(THEMES_LIST.length).toBeGreaterThan(0);

    const ids = THEMES_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const theme of THEMES_LIST) {
      // The list must be derived from the same registry lookups return.
      expect(THEMES[theme.id]).toBe(theme);
      expect(['dark', 'light']).toContain(theme.mode);
      expect(theme.colors.accent).toBeTruthy();
      expect(Object.keys(theme.colors.series)).toHaveLength(8);
    }

    // Both modes must be represented so the selector's grouping stays meaningful.
    expect(THEMES_LIST.some((t) => t.mode === 'dark')).toBe(true);
    expect(THEMES_LIST.some((t) => t.mode === 'light')).toBe(true);
  });

  it('provides default dark theme when no storage preference exists', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.themeId).toBe('dark');
    expect(result.current.mode).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.isLight).toBe(false);
    expect(result.current.availableThemes).toBe(THEMES_LIST);
    expect(result.current.colors).toBe(darkTheme.colors);
  });

  it('retrieves stored theme from localStorage on initial render', () => {
    localStorage.setItem('cubeprogression_theme', 'light');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.themeId).toBe('light');
    expect(result.current.mode).toBe('light');
    expect(result.current.isLight).toBe(true);
  });

  it('falls back to the default dark theme when the stored value is unknown', () => {
    localStorage.setItem('cubeprogression_theme', 'definitely-not-a-theme');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.themeId).toBe('dark');
  });

  it('honours the initialTheme prop over an empty storage preference', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ThemeProvider initialTheme="retro">{children}</ThemeProvider>
      ),
    });

    expect(result.current.themeId).toBe('retro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro');
  });

  it('allows programmatic theme switching via setTheme', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('gan-mint');
    });

    expect(result.current.themeId).toBe('gan-mint');
    expect(localStorage.getItem('cubeprogression_theme')).toBe('gan-mint');
    expect(document.documentElement.getAttribute('data-theme')).toBe('gan-mint');
  });

  it('ignores setTheme calls for unknown theme ids', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('not-a-real-theme' as ThemeId);
    });

    expect(result.current.themeId).toBe('dark');
    expect(localStorage.getItem('cubeprogression_theme')).toBeNull();
  });

  it('switches between multiple themes including solarized-dark and retro', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('solarized-dark');
    });

    expect(result.current.themeId).toBe('solarized-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('solarized-dark');

    act(() => {
      result.current.setTheme('retro');
    });

    expect(result.current.themeId).toBe('retro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro');
  });

  it('synchronises mode attributes when switching between dark and light themes', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    const root = document.documentElement;
    expect(root.getAttribute('data-theme-mode')).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(root.getAttribute('data-theme-mode')).toBe('light');
    expect(result.current.isLight).toBe(true);
    expect(result.current.isDark).toBe(false);
    // The window canvas follows the theme so Safari letterbox/overscroll areas match.
    expect(root.style.backgroundColor).toBe('rgb(248, 250, 252)');

    act(() => {
      result.current.setTheme('wca');
    });

    expect(root.getAttribute('data-theme-mode')).toBe('dark');
  });

  it('drives the stone surface ramp from the active theme, including the mode-specific 800 shade', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    const root = document.documentElement;

    act(() => {
      result.current.setTheme('light');
    });

    const light = getTheme('light').colors;
    expect(light.border).not.toBe(light.bgSubtle);
    expect(root.style.getPropertyValue('--color-stone-950')).toBe(light.bgApp);
    expect(root.style.getPropertyValue('--color-stone-900')).toBe(light.bgCard);
    // Light mode swaps the 800 shade to the border tone for visible elevation.
    expect(root.style.getPropertyValue('--color-stone-800')).toBe(light.border);

    act(() => {
      result.current.setTheme('dark');
    });

    const dark = getTheme('dark').colors;
    expect(root.style.getPropertyValue('--color-stone-800')).toBe(dark.bgSubtle);
    expect(root.style.getPropertyValue('--color-stone-800')).not.toBe(light.border);
  });

  it('exposes accent and focus tokens derived from the active theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    const root = document.documentElement;

    act(() => {
      result.current.setTheme('cyberpunk');
    });

    const cyberpunk = getTheme('cyberpunk').colors;
    expect(root.style.getPropertyValue('--color-accent')).toBe(cyberpunk.accent);
    expect(root.style.getPropertyValue('--color-accent-hover')).toBe(cyberpunk.accentHover);
    expect(root.style.getPropertyValue('--color-accent-muted')).toBe(cyberpunk.accentMuted);
    expect(root.style.getPropertyValue('--color-accent-text')).toBe(cyberpunk.accentText);
    expect(root.style.getPropertyValue('--color-border-focus')).toBe(cyberpunk.accent);
  });

  it('drives Tailwind palette variables from the active theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    const root = document.documentElement;

    act(() => {
      result.current.setTheme('gan-mint');
    });

    const ganMint = getTheme('gan-mint').colors;
    expect(root.style.getPropertyValue('--color-amber-500')).toBe(ganMint.accent);
    expect(root.style.getPropertyValue('--color-emerald-500')).toBe(ganMint.series.green);
    expect(root.style.getPropertyValue('--color-rose-500')).toBe(ganMint.series.red);
    expect(root.style.getPropertyValue('--color-sky-500')).toBe(ganMint.series.blue);
    expect(root.style.getPropertyValue('--color-teal-500')).toBe(ganMint.series.teal);
    expect(root.style.getPropertyValue('--color-yellow-500')).toBe(ganMint.series.amber);
    expect(root.style.getPropertyValue('--color-purple-500')).toBe(ganMint.series.purple);

    act(() => {
      result.current.setTheme('cyberpunk');
    });

    const cyberpunk = getTheme('cyberpunk').colors;
    // Palette utilities must change with the theme rather than stay static.
    expect(root.style.getPropertyValue('--color-amber-500')).toBe(cyberpunk.accent);
    expect(root.style.getPropertyValue('--color-emerald-500')).toBe(cyberpunk.series.green);
    expect(cyberpunk.accent).not.toBe(ganMint.accent);
  });

  it('getTheme falls back to darkTheme for unknown theme IDs', () => {
    const fallback = getTheme('unknown-nonexistent-id');
    expect(fallback.id).toBe('dark');
  });
});
