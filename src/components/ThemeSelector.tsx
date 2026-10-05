import { Check, Moon, Palette, Sun } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { type ThemeDefinition, type ThemeId, useTheme } from '../theme';

export const ThemeSelector: FC = () => {
  const { themeId, colors, availableThemes, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (id: ThemeId) => {
    setTheme(id);
    setIsOpen(false);
  };

  const currentTheme = availableThemes.find((t) => t.id === themeId) ?? availableThemes[0];

  const darkThemes = availableThemes.filter((t) => t.mode === 'dark');
  const lightThemes = availableThemes.filter((t) => t.mode === 'light');

  const renderThemeButton = (t: ThemeDefinition) => {
    const isSelected = t.id === themeId;
    return (
      <button
        key={t.id}
        id={`theme-option-${t.id}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => handleSelectTheme(t.id)}
        style={
          isSelected
            ? {
                backgroundColor: `${t.colors.accent}20`,
                borderColor: `${t.colors.accent}50`,
                color: t.colors.accentText,
              }
            : undefined
        }
        className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer border ${
          isSelected
            ? 'shadow-sm'
            : 'text-stone-300 hover:bg-stone-800/80 hover:text-stone-100 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Theme Preview Color Swatches */}
          <div className="flex items-center gap-1 shrink-0 rounded-md p-1 border border-stone-700/50 bg-stone-950/60">
            <span
              className="h-3 w-3 rounded-full shrink-0 border border-black/15 dark:border-white/15"
              style={{ backgroundColor: t.colors.bgApp }}
            />
            <span
              className="h-3 w-3 rounded-full shrink-0 border border-black/15 dark:border-white/15"
              style={{ backgroundColor: t.colors.bgCard }}
            />
            <span
              className="h-3 w-3 rounded-full shrink-0 border border-black/15 dark:border-white/15"
              style={{ backgroundColor: t.colors.accent }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{t.name}</span>
            <span className="text-[10px] text-stone-400 truncate opacity-75">{t.description}</span>
          </div>
        </div>
        {isSelected && (
          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.colors.accent }} />
        )}
      </button>
    );
  };

  return (
    <div id="theme-selector" ref={containerRef} className="relative inline-flex items-center">
      {/* Theme Selector Trigger Button */}
      <button
        id="theme-selector-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select theme"
        title="Select color theme"
        className="inline-flex cursor-pointer items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800/90 px-2 py-1.5 sm:px-3 text-xs font-medium text-stone-200 transition-all hover:border-amber-500/40 hover:bg-stone-700/80 active:scale-95 shadow-sm shrink-0"
      >
        <Palette className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span
          className="h-2 w-2 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: colors.accent }}
        />
        <span className="hidden md:inline max-w-[110px] truncate text-stone-300 font-medium">
          {currentTheme.name}
        </span>
      </button>

      {/* Theme Dropdown Menu */}
      {isOpen && (
        <div
          id="theme-dropdown-menu"
          role="listbox"
          aria-label="Available themes"
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-stone-700/80 bg-stone-900/95 p-2 shadow-2xl backdrop-blur-md animate-fade-in-scale"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-800/80 mb-1 flex items-center justify-between">
            <span>Color Themes</span>
            <span className="text-[10px] text-stone-500 font-mono">
              {availableThemes.length} Themes
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1 py-0.5">
            {/* Dark Themes Group */}
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-stone-400" />
              <span>Dark Themes</span>
            </div>
            {darkThemes.map(renderThemeButton)}

            {/* Light Themes Group */}
            <div className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 border-t border-stone-800/60 mt-1.5">
              <Sun className="h-3 w-3 text-amber-500" />
              <span>Light Themes</span>
            </div>
            {lightThemes.map(renderThemeButton)}
          </div>
        </div>
      )}
    </div>
  );
};
