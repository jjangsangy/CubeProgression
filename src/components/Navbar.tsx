import { Download, ExternalLink, HelpCircle, WifiOff } from 'lucide-react';
import type React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useTheme } from '../theme/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface NavbarProps {
  canInstall?: boolean;
  onInstall?: () => void;
  isOnline?: boolean;
  onOpenInstructions?: () => void;
}

const baseUrl = import.meta.env.BASE_URL || './';
const logoSrc = baseUrl.endsWith('/') ? `${baseUrl}favicon.svg` : `${baseUrl}/favicon.svg`;

export const Navbar: React.FC<NavbarProps> = ({
  canInstall: propCanInstall,
  onInstall,
  isOnline: propIsOnline,
  onOpenInstructions,
}) => {
  const hookOnlineStatus = useOnlineStatus();
  const pwaInstall = usePwaInstall();

  const isOnline = propIsOnline ?? hookOnlineStatus;
  const isInstalled = pwaInstall.isInstalled;
  const isStandalone = pwaInstall.isStandalone;

  // The button should be shown when not running inside the standalone app window.
  // When installed, it acts as "Open in App"; when not installed, it acts as "Install App".
  const showAppButton = propCanInstall !== undefined ? propCanInstall : !isStandalone;
  const handleAction = onInstall ?? (isInstalled ? pwaInstall.openInApp : pwaInstall.promptInstall);
  const actionLabel = isInstalled ? 'Open in App' : 'Install App';
  const actionTitle = isInstalled
    ? 'Open CubeProgression in the installed app'
    : 'Install CubeProgression as a Progressive Web App';
  const { colors } = useTheme();

  return (
    <header id="navbar" className="relative border-b border-stone-800 bg-stone-950 w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 safe-area-x w-full gap-2 sm:gap-4">
        {/* Brand Logo & Title */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <img
            src={logoSrc}
            alt="CubeProgression Logo"
            title="CubeProgression"
            width={40}
            height={40}
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl shadow-lg shadow-amber-500/10"
          />
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-[15px] sm:text-base md:text-lg leading-tight font-bold tracking-tight text-stone-100 whitespace-nowrap">
                <span>CubeProgression</span>
              </h1>
              <span
                className="hidden sm:inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase"
                style={{
                  borderColor: `${colors.accent}40`,
                  backgroundColor: `${colors.accent}15`,
                  color: colors.accent,
                }}
              >
                csTimer Analytics
              </span>
            </div>
            <p
              className="text-[10px] text-amber-400/90 font-medium tracking-wide sm:hidden leading-none mt-0.5"
              style={{ color: colors.accent }}
            >
              csTimer Progression
            </p>
            <p className="text-xs text-stone-400 truncate max-w-xs xl:max-w-md hidden xl:block">
              Speedcubing solve time progression &amp; statistical shift analyzer
            </p>
          </div>
        </div>

        {/* Right Status & Action Items */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-2.5 min-w-0">
          {!isOnline && (
            <div
              id="navbar-offline-status"
              role="status"
              aria-label="Offline mode"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 lg:px-2.5 lg:py-1 text-xs font-medium text-amber-400 shrink-0"
              title="You are offline. All features, solves, and statistics operate locally."
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden lg:inline">Offline mode</span>
              <span className="sr-only lg:hidden">Offline mode</span>
            </div>
          )}

          {showAppButton && (
            <button
              id="navbar-install"
              type="button"
              onClick={handleAction}
              aria-label={actionLabel}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 lg:px-3 lg:py-1.5 text-xs font-medium whitespace-nowrap text-amber-300 shadow-sm transition-all hover:bg-amber-500/20 active:scale-95 shrink-0"
              style={{
                borderColor: `${colors.accent}40`,
                backgroundColor: `${colors.accent}15`,
                color: colors.accentText,
              }}
              title={actionTitle}
            >
              {isInstalled ? (
                <ExternalLink
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  style={{ color: colors.accent }}
                />
              ) : (
                <Download
                  className="h-3.5 w-3.5 shrink-0 text-amber-400"
                  style={{ color: colors.accent }}
                />
              )}
              <span className="hidden sm:inline">{actionLabel}</span>
            </button>
          )}

          {/* Theme Selector */}
          <ThemeSelector />

          {onOpenInstructions && (
            <button
              id="navbar-guide"
              type="button"
              onClick={onOpenInstructions}
              aria-label="csTimer Guide"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-700/60 bg-stone-800/90 px-2.5 py-1.5 sm:px-3 text-xs font-medium whitespace-nowrap text-stone-200 transition-all hover:border-amber-500/40 hover:bg-stone-700/80 active:scale-95 shadow-sm shrink-0"
              title="How to export solves from csTimer"
            >
              <HelpCircle
                className="h-3.5 w-3.5 shrink-0 text-amber-400"
                style={{ color: colors.accent }}
              />
              <span className="sm:hidden">Guide</span>
              <span className="hidden sm:inline">csTimer Guide</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
