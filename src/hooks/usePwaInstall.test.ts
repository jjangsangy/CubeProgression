import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePwaInstall } from './usePwaInstall';

describe('usePwaInstall hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default initial values when beforeinstallprompt has not fired', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('returns false immediately when promptInstall is called without a deferredPrompt', async () => {
    const { result } = renderHook(() => usePwaInstall());
    let installed = true;
    await act(async () => {
      installed = await result.current.promptInstall();
    });
    expect(installed).toBe(false);
  });

  it('captures beforeinstallprompt event and enables canInstall, resolving true on accept', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const preventDefaultMock = vi.fn();
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt') as unknown as {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    mockEvent.preventDefault = preventDefaultMock;
    mockEvent.prompt = promptMock;
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockEvent as unknown as Event);
    });

    expect(preventDefaultMock).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(true);

    let installed = false;
    await act(async () => {
      installed = await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('handles user prompt dismissal: returns false and clears deferredPrompt', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const preventDefaultMock = vi.fn();
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockEvent = new Event('beforeinstallprompt') as unknown as {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    mockEvent.preventDefault = preventDefaultMock;
    mockEvent.prompt = promptMock;
    mockEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockEvent as unknown as Event);
    });

    expect(result.current.canInstall).toBe(true);

    let installed = true;
    await act(async () => {
      installed = await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(installed).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('handles prompt() exceptions gracefully and returns false', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockEvent = new Event('beforeinstallprompt') as unknown as {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<never>;
    };
    mockEvent.preventDefault = vi.fn();
    mockEvent.prompt = vi.fn().mockRejectedValue(new Error('User gesture required'));

    act(() => {
      window.dispatchEvent(mockEvent as unknown as Event);
    });

    let installed = true;
    await act(async () => {
      installed = await result.current.promptInstall();
    });

    expect(installed).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('initializes isInstalled as true when running in standalone display mode', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('sets isInstalled when appinstalled event fires', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePwaInstall());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
  });
});
