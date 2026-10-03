import { act, fireEvent } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { DEFAULT_TOOLTIP_DISMISS_DELAY_MS } from '../hooks/useAutoDismissTooltip';

/**
 * Shared test verification for Recharts chart components integrating useAutoDismissTooltip.
 *
 * Verifies that:
 * 1. Initially delegates to Recharts (tooltipActive === undefined).
 * 2. Active touch keeps delegation active.
 * 3. Releasing touch starts countdown and dismisses after delay (tooltipActive === false).
 * 4. Touching again re-enables delegation immediately.
 */
export function verifyChartTooltipAutoDismiss(
  element: HTMLElement,
  getTooltipActive: () => boolean | undefined,
  delayMs: number = DEFAULT_TOOLTIP_DISMISS_DELAY_MS,
): void {
  expect(getTooltipActive()).toBeUndefined();

  // Active touch maintains delegation
  fireEvent.touchStart(element);
  expect(getTooltipActive()).toBeUndefined();

  // Touch release begins auto-dismiss countdown
  fireEvent.touchEnd(element);
  expect(getTooltipActive()).toBeUndefined();

  // After countdown delay expires, tooltip is forced dismissed
  act(() => {
    vi.advanceTimersByTime(delayMs);
  });
  expect(getTooltipActive()).toBe(false);

  // New touch immediately reactivates delegation
  fireEvent.touchStart(element);
  expect(getTooltipActive()).toBeUndefined();
}
