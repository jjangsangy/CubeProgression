import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const DEFAULT_TOOLTIP_DISMISS_DELAY_MS = 1500;

export interface UseAutoDismissTooltipOptions {
  /**
   * Timeout in milliseconds after touch release before the tooltip hides.
   * Default: 1500ms (1.5 seconds).
   */
  dismissDelayMs?: number;
  /**
   * Optional callback when auto-dismiss occurs (e.g. to clear hovered state in SVG charts).
   */
  onDismiss?: () => void;
  /**
   * Optional container ref. If not provided, an internal ref is returned as containerRef.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseAutoDismissTooltipReturn {
  /**
   * Ref to attach to the chart container div.
   */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Tooltip active prop to pass to Recharts `<Tooltip active={tooltipActive} />`.
   * For mouse hover, always evaluates to `undefined` (delegating to Recharts).
   * For touch, evaluates to `false` when dismissed to hide the tooltip, or `undefined` while active.
   */
  tooltipActive: false | undefined;
  /**
   * Whether the tooltip is currently dismissed by the touch auto-dismiss timer.
   */
  isDismissed: boolean;
  /**
   * Event handlers to spread onto the chart container `div`.
   */
  touchHandlers: {
    onTouchStart: () => void;
    onTouchMove: () => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
    onPointerMove: (e: React.PointerEvent) => void;
  };
  /**
   * Programmatically dismiss the tooltip immediately and invoke `onDismiss`.
   */
  dismissTooltip: () => void;
  /**
   * Programmatically reset tooltip dismissal state to active/idle.
   */
  resetTooltip: () => void;
}

/**
 * Reusable hook to auto-dismiss chart tooltips on touch devices.
 *
 * Rules:
 * 1. MOUSE (desktop): Always stays up during hover/interaction. Never auto-dismissed.
 * 2. TOUCH (mobile):
 *    - Visible while touching or dragging.
 *    - When the user taps/releases their touch, a 1.5s countdown starts to auto-dismiss.
 *    - Tapping outside the chart or scrolling on touch immediately dismisses the tooltip.
 *    - If the user touches the chart again, countdown is cancelled immediately.
 */
export function useAutoDismissTooltip(
  options?: UseAutoDismissTooltipOptions,
): UseAutoDismissTooltipReturn {
  const dismissDelayMs = options?.dismissDelayMs ?? DEFAULT_TOOLTIP_DISMISS_DELAY_MS;
  const onDismissRef = useRef(options?.onDismiss);
  onDismissRef.current = options?.onDismiss;

  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = (options?.containerRef ??
    internalRef) as React.RefObject<HTMLDivElement | null>;

  const [isDismissed, setIsDismissed] = useState(false);
  const isTouchingRef = useRef(false);
  const isTouchModeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchActive = useCallback(() => {
    isTouchModeRef.current = true;
    isTouchingRef.current = true;
    clearTimer();
    setIsDismissed(false);
  }, [clearTimer]);

  const handleTouchRelease = useCallback(() => {
    isTouchingRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!isTouchingRef.current) {
        setIsDismissed(true);
        onDismissRef.current?.();
      }
    }, dismissDelayMs);
  }, [clearTimer, dismissDelayMs]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Physical mouse movement over the chart resets touch mode and dismissal
      if (e.pointerType === 'mouse') {
        isTouchModeRef.current = false;
        if (isDismissed) {
          clearTimer();
          setIsDismissed(false);
        }
      }
    },
    [clearTimer, isDismissed],
  );

  const dismissTooltip = useCallback(() => {
    clearTimer();
    setIsDismissed(true);
    onDismissRef.current?.();
  }, [clearTimer]);

  const resetTooltip = useCallback(() => {
    clearTimer();
    setIsDismissed(false);
  }, [clearTimer]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Listen to global window touch release so lifting a finger outside container still starts dismiss timer
    const handleWindowTouchEnd = () => {
      if (isTouchingRef.current) {
        handleTouchRelease();
      }
    };

    // Tapping outside on touch devices immediately dismisses
    const handleDocumentTouchStart = (e: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearTimer();
        isTouchingRef.current = false;
        setIsDismissed(true);
        onDismissRef.current?.();
      }
    };

    // Scrolling on touch devices dismisses the tooltip
    const handleScroll = () => {
      if (isTouchModeRef.current && !isTouchingRef.current) {
        clearTimer();
        setIsDismissed(true);
        onDismissRef.current?.();
      }
    };

    window.addEventListener('touchend', handleWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: true });
    document.addEventListener('touchstart', handleDocumentTouchStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimer();
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
      document.removeEventListener('touchstart', handleDocumentTouchStart);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [clearTimer, containerRef, handleTouchRelease]);

  const touchHandlers = useMemo(
    () => ({
      onTouchStart: handleTouchActive,
      onTouchMove: handleTouchActive,
      onTouchEnd: handleTouchRelease,
      onTouchCancel: handleTouchRelease,
      onPointerMove: handlePointerMove,
    }),
    [handleTouchActive, handleTouchRelease, handlePointerMove],
  );

  return {
    containerRef,
    tooltipActive: isDismissed ? false : undefined,
    isDismissed,
    touchHandlers,
    dismissTooltip,
    resetTooltip,
  };
}
