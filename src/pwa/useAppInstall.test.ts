import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppInstallStateForTesting, useAppInstall } from './useAppInstall';
import { useOnlineStatus } from './useOnlineStatus';

describe('useAppInstall', () => {
  beforeEach(() => {
    resetAppInstallStateForTesting();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetAppInstallStateForTesting();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides the full installation interface with idle defaults', () => {
    const { result } = renderHook(() => useAppInstall());

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.canShowButton).toBe(true);
    expect(result.current.actionType).toBe('install');
    expect(result.current.actionLabel).toBe('Install App');
    expect(result.current.actionTitle).toBe('Install CubeProgression as a Progressive Web App');
    expect(typeof result.current.triggerAction).toBe('function');
    expect(typeof result.current.promptInstall).toBe('function');
    expect(typeof result.current.openInApp).toBe('function');
  });

  it('captures beforeinstallprompt and enables installation through the native prompt', async () => {
    const { result } = renderHook(() => useAppInstall());

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

  it('marks the app as installed when the appinstalled event fires', () => {
    const { result } = renderHook(() => useAppInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('invokes custom protocol navigation on openInApp', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() => useAppInstall());

    act(() => {
      result.current.openInApp();
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  it('reports standalone display mode as not installable on first render', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('display-mode: standalone'),
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );

    try {
      const { result } = renderHook(() => useAppInstall());

      expect(result.current.isStandalone).toBe(true);
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canShowButton).toBe(false);
    } finally {
      matchMediaSpy.mockRestore();
    }
  });

  it('delegates to the pwa-install element when present on a bridge platform', async () => {
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    const installMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(mockPwaEl, {
      showDialog: showDialogMock,
      install: installMock,
    });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => useAppInstall());
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

  it('falls back to the pwa-install element when the native prompt throws', async () => {
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    const installMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(mockPwaEl, {
      showDialog: showDialogMock,
      install: installMock,
    });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => useAppInstall());

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

  it('detects an installed app from localStorage and suppresses installation', async () => {
    localStorage.setItem('cubeprogression_pwa_installed', 'true');
    const mockPwaEl = document.createElement('pwa-install');
    const showDialogMock = vi.fn();
    Object.assign(mockPwaEl, { showDialog: showDialogMock });
    document.body.appendChild(mockPwaEl);

    try {
      const { result } = renderHook(() => useAppInstall());
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

  it('detects an installed app from navigator.getInstalledRelatedApps', async () => {
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
      const { result } = renderHook(() => useAppInstall());
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

  it('does not trigger the pwa-install dialog on non-bridge platforms without a deferred prompt', async () => {
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
      const { result } = renderHook(() => useAppInstall());
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

  it('disables installation and suppresses the prompt on Firefox platforms', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      configurable: true,
    });

    try {
      const { result } = renderHook(() => useAppInstall());
      expect(result.current.canInstall).toBe(false);
      expect(result.current.canShowButton).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.promptInstall();
      });
      expect(installed).toBe(false);
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });
});

describe('useOnlineStatus', () => {
  it('reports connectivity from the initial navigator.onLine value', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('tracks offline and online window events', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
