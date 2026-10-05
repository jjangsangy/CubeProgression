import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePwaInstall } from './usePwaInstall';

describe('usePwaInstall hook', () => {
  afterEach(() => {
    localStorage.clear();
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

  it('enables canInstall and delegates to pwa-install element when present in DOM', async () => {
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    const installMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(mockPwaEl, {
      showDialog: showDialogMock,
      install: installMock,
    });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.canInstall).toBe(true);

      let installed = false;
      await act(async () => {
        installed = await result.current.promptInstall();
      });

      expect(showDialogMock).toHaveBeenCalledWith(true);
      expect(installMock).toHaveBeenCalled();
      expect(installed).toBe(true);
    } finally {
      mockPwaEl.remove();
    }
  });

  it('falls back to pwa-install element when native prompt throws', async () => {
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    const installMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(mockPwaEl, {
      showDialog: showDialogMock,
      install: installMock,
    });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => usePwaInstall());

      const mockEvent = new Event('beforeinstallprompt') as unknown as {
        preventDefault: () => void;
        prompt: () => Promise<void>;
        userChoice: Promise<never>;
      };
      mockEvent.preventDefault = vi.fn();
      mockEvent.prompt = vi.fn().mockRejectedValue(new Error('Prompt error'));

      act(() => {
        window.dispatchEvent(mockEvent as unknown as Event);
      });

      let installed = false;
      await act(async () => {
        installed = await result.current.promptInstall();
      });

      expect(showDialogMock).toHaveBeenCalledWith(true);
      expect(installMock).toHaveBeenCalled();
      expect(installed).toBe(true);
    } finally {
      mockPwaEl.remove();
    }
  });

  it('detects already installed state from localStorage and suppresses installation', async () => {
    localStorage.setItem('cubeprogression_pwa_installed', 'true');
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    Object.assign(mockPwaEl, { showDialog: showDialogMock });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.promptInstall();
      });

      expect(installed).toBe(false);
      expect(showDialogMock).not.toHaveBeenCalled();
    } finally {
      mockPwaEl.remove();
    }
  });

  it('detects already installed state from navigator.getInstalledRelatedApps', async () => {
    const originalNavigator = window.navigator;
    const getInstalledRelatedAppsMock = vi
      .fn()
      .mockResolvedValue([{ platform: 'webapp', id: './' }]);
    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        getInstalledRelatedApps: getInstalledRelatedAppsMock,
      },
      configurable: true,
      writable: true,
    });

    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    Object.assign(mockPwaEl, { showDialog: showDialogMock });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => usePwaInstall());
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.promptInstall();
      });

      expect(installed).toBe(false);
      expect(showDialogMock).not.toHaveBeenCalled();
    } finally {
      mockPwaEl.remove();
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('does not trigger pwa-install dialog on non-bridge platforms when deferredPrompt is null', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      configurable: true,
    });

    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    const installMock = vi.fn();
    Object.assign(mockPwaEl, {
      showDialog: showDialogMock,
      install: installMock,
    });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.promptInstall();
      });

      expect(installed).toBe(false);
      expect(showDialogMock).not.toHaveBeenCalled();
      expect(installMock).not.toHaveBeenCalled();
    } finally {
      mockPwaEl.remove();
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });

  it('navigates to registered protocol URL without opening a new tab when openInApp is invoked', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    let clickedHref = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedHref = this.href;
    });

    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      result.current.openInApp();
    });

    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(clickedHref).toContain('web+cubeprogression://open?url=');
  });
});
