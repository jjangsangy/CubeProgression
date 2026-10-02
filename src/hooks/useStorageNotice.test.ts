import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbStorage from '../utils/dbStorage';
import { useStorageNotice, useStorageStatus } from './useStorageNotice';

describe('useStorageNotice', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default empty storage states', () => {
    const { result } = renderHook(() => useStorageNotice());

    expect(result.current.savedNotice).toBeNull();
    expect(result.current.storageUsageMB).toBeUndefined();
    expect(result.current.isSaved).toBe(false);
  });

  it('sets and auto-dismisses notice after default 3500ms delay', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStorageNotice());

    act(() => {
      result.current.showNotice('Dataset saved successfully!');
    });

    expect(result.current.savedNotice).toBe('Dataset saved successfully!');

    // Advance right before threshold
    act(() => {
      vi.advanceTimersByTime(3499);
    });
    expect(result.current.savedNotice).toBe('Dataset saved successfully!');

    // Advance to threshold
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.savedNotice).toBeNull();
  });

  it('resets timer when a new notice is triggered before previous timer elapses', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStorageNotice());

    act(() => {
      result.current.showNotice('First notice');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.savedNotice).toBe('First notice');

    act(() => {
      result.current.showNotice('Second notice');
    });
    expect(result.current.savedNotice).toBe('Second notice');

    // 2000ms later (total 4000ms from start, but 2000ms since second notice)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.savedNotice).toBe('Second notice');

    // Remaining 1500ms to hit 3500ms since second notice
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.savedNotice).toBeNull();
  });

  it('clears notice immediately and cancels timer on clearNotice()', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStorageNotice());

    act(() => {
      result.current.showNotice('Temporary notice');
    });
    expect(result.current.savedNotice).toBe('Temporary notice');

    act(() => {
      result.current.clearNotice();
    });
    expect(result.current.savedNotice).toBeNull();

    // Advancing timers should not cause any errors or re-triggers
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.savedNotice).toBeNull();
  });

  it('respects custom autoDismissMs configuration', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStorageNotice({ autoDismissMs: 1500 }));

    act(() => {
      result.current.showNotice('Fast dismiss');
    });

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(result.current.savedNotice).toBe('Fast dismiss');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.savedNotice).toBeNull();
  });

  it('refreshes storage usage via getStorageInfo()', async () => {
    vi.spyOn(dbStorage, 'getStorageInfo').mockResolvedValueOnce({
      usageMB: 1.85,
      quotaMB: 500,
    });

    const { result } = renderHook(() => useStorageNotice());

    let usage: number | undefined;
    await act(async () => {
      usage = await result.current.refreshStorageUsage();
    });

    expect(usage).toBe(1.85);
    expect(result.current.storageUsageMB).toBe(1.85);
  });

  it('handles getStorageInfo failure or null return gracefully', async () => {
    vi.spyOn(dbStorage, 'getStorageInfo').mockResolvedValueOnce(null);

    const { result } = renderHook(() => useStorageNotice());

    let usage: number | undefined;
    await act(async () => {
      usage = await result.current.refreshStorageUsage();
    });

    expect(usage).toBeUndefined();
    expect(result.current.storageUsageMB).toBeUndefined();
  });

  it('handles getStorageInfo rejection gracefully without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'getStorageInfo').mockRejectedValueOnce(
      new Error('Storage estimate unavailable'),
    );

    const { result } = renderHook(() => useStorageNotice());

    let usage: number | undefined;
    await act(async () => {
      usage = await result.current.refreshStorageUsage();
    });

    expect(usage).toBeUndefined();
    expect(result.current.storageUsageMB).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to read storage usage:', expect.any(Error));
  });

  it('formats notice and updates state on notifySaved()', async () => {
    vi.spyOn(dbStorage, 'getStorageInfo').mockResolvedValueOnce({
      usageMB: 1.25,
      quotaMB: 500,
    });
    const { result } = renderHook(() => useStorageNotice());

    await act(async () => {
      result.current.notifySaved(350, 2, 'solves.txt');
    });

    expect(result.current.isSaved).toBe(true);
    expect(result.current.storageUsageMB).toBe(1.25);
    expect(result.current.savedNotice).toBe(
      'Saved 350 solves across 2 sessions to browser storage (solves.txt)',
    );
  });

  it('formats notice and updates state on notifyRestored()', async () => {
    vi.spyOn(dbStorage, 'getStorageInfo').mockResolvedValueOnce({
      usageMB: 0.42,
      quotaMB: 500,
    });
    const { result } = renderHook(() => useStorageNotice());

    await act(async () => {
      result.current.notifyRestored(1200, 3, 'backup.txt');
    });

    expect(result.current.isSaved).toBe(true);
    expect(result.current.storageUsageMB).toBe(0.42);
    expect(result.current.savedNotice).toBe(
      'Restored 1,200 solves across 3 sessions from IndexedDB (backup.txt)',
    );
  });

  it('manages isSaved flag and resetStorageNotice()', () => {
    const { result } = renderHook(() => useStorageNotice());

    act(() => {
      result.current.setIsSaved(true);
      result.current.setStorageUsageMB(2.5);
      result.current.showNotice('Data loaded');
    });

    expect(result.current.isSaved).toBe(true);
    expect(result.current.storageUsageMB).toBe(2.5);
    expect(result.current.savedNotice).toBe('Data loaded');

    act(() => {
      result.current.resetStorageNotice();
    });

    expect(result.current.isSaved).toBe(false);
    expect(result.current.storageUsageMB).toBeUndefined();
    expect(result.current.savedNotice).toBeNull();
  });

  it('clears active auto-dismiss timer on unmount', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useStorageNotice());

    act(() => {
      result.current.showNotice('Will unmount');
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('useStorageStatus exposes isSaved and storageUsageMB independently', () => {
    const { result: statusResult } = renderHook(() => useStorageStatus());
    const { result: noticeResult } = renderHook(() => useStorageNotice());

    expect(statusResult.current.isSaved).toBe(false);
    expect(statusResult.current.storageUsageMB).toBeUndefined();

    act(() => {
      noticeResult.current.setIsSaved(true);
      noticeResult.current.setStorageUsageMB(3.14);
    });

    expect(statusResult.current.isSaved).toBe(true);
    expect(statusResult.current.storageUsageMB).toBe(3.14);
  });
});
