import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TOOLTIP_DISMISS_DELAY_MS, useAutoDismissTooltip } from './useAutoDismissTooltip';

describe('useAutoDismissTooltip hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes with idle/active state where tooltipActive is undefined (preserving mouse hover)', () => {
    const { result } = renderHook(() => useAutoDismissTooltip());

    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
  });

  it('keeps tooltip active while user is touching or dragging, even past the delay duration', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
    });

    // Advance time past default delay while finger is still held down
    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS + 2000);
    });

    // Tooltip must remain visible
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled();

    // Dragging across points also maintains touch state
    act(() => {
      result.current.touchHandlers.onTouchMove();
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS + 2000);
    });

    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('starts timer when user releases touch (onTouchEnd) and dismisses after delay', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });

    // 1ms before timeout: still visible
    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS - 1);
    });
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled();

    // Exactly at timeout: dismissed
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('triggers touch release via window touchend if finger lifts outside container', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
    });

    // Finger lifts outside chart container (dispatched on window)
    act(() => {
      window.dispatchEvent(new Event('touchend'));
    });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('cancels pending dismiss timer if user touches down again before timer expires', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // User touches chart again
    act(() => {
      result.current.touchHandlers.onTouchStart();
    });

    // Advance past original timeout
    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS + 500);
    });

    // Tooltip should still be visible because timer was cancelled
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('re-activates tooltip immediately when touchStart fires after dismissal', () => {
    const { result } = renderHook(() => useAutoDismissTooltip());

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS);
    });
    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);

    // User touches chart again
    act(() => {
      result.current.touchHandlers.onTouchStart();
    });
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.tooltipActive).toBeUndefined();
  });

  it('dismisses tooltip immediately when tapping outside with touch', () => {
    const onDismiss = vi.fn();
    const containerDiv = document.createElement('div');
    const outsideDiv = document.createElement('div');
    document.body.appendChild(containerDiv);
    document.body.appendChild(outsideDiv);

    const ref = { current: containerDiv };
    const { result } = renderHook(() => useAutoDismissTooltip({ containerRef: ref, onDismiss }));

    // User touches chart
    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });
    expect(result.current.isDismissed).toBe(false);

    // User taps outside element on document with touch
    act(() => {
      const event = new Event('touchstart', { bubbles: true });
      outsideDiv.dispatchEvent(event);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    document.body.removeChild(containerDiv);
    document.body.removeChild(outsideDiv);
  });

  it('handles onTouchCancel identically to onTouchEnd by starting dismiss timer', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchCancel();
    });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports custom dismissDelayMs', () => {
    const customDelayMs = 800;
    const { result } = renderHook(() => useAutoDismissTooltip({ dismissDelayMs: customDelayMs }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });

    act(() => {
      vi.advanceTimersByTime(customDelayMs - 1);
    });
    expect(result.current.isDismissed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isDismissed).toBe(true);
  });

  it('allows manual dismissTooltip and resetTooltip, cancelling any pending timer', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
      result.current.resetTooltip();
    });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS + 500);
    });
    expect(result.current.isDismissed).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      result.current.dismissTooltip();
    });
    expect(result.current.isDismissed).toBe(true);
    expect(result.current.tooltipActive).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('invokes the latest onDismiss callback if callback prop changes during countdown', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useAutoDismissTooltip({ onDismiss: cb }),
      { initialProps: { cb: firstCallback } },
    );

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });

    // Callback changes halfway through countdown
    rerender({ cb: secondCallback });

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS);
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('cleans up timer and global listeners on unmount without errors or state updates', () => {
    const onDismiss = vi.fn();
    const { result, unmount } = renderHook(() => useAutoDismissTooltip({ onDismiss }));

    act(() => {
      result.current.touchHandlers.onTouchStart();
      result.current.touchHandlers.onTouchEnd();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOOLTIP_DISMISS_DELAY_MS + 1000);
      window.dispatchEvent(new Event('touchend'));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
