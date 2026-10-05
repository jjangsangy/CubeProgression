import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as pwaRegister from '../utils/pwaRegister';
import { resetPwaStateForTesting, usePwa } from './usePwa';

describe('usePwa hook', () => {
  beforeEach(() => {
    resetPwaStateForTesting();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetPwaStateForTesting();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides structured connectivity, install, and update interfaces', () => {
    const { result } = renderHook(() => usePwa());

    expect(typeof result.current.connectivity.isOnline).toBe('boolean');
    expect(result.current.connectivity.isOnline).toBe(true);

    expect(result.current.install.canInstall).toBe(false);
    expect(result.current.install.isInstalled).toBe(false);
    expect(result.current.install.isStandalone).toBe(false);
    expect(typeof result.current.install.promptInstall).toBe('function');
    expect(typeof result.current.install.openInApp).toBe('function');

    expect(result.current.update.isUpdateAvailable).toBe(false);
    expect(result.current.update.isUpdating).toBe(false);
    expect(typeof result.current.update.applyUpdateAndReload).toBe('function');
    expect(typeof result.current.update.dismissUpdate).toBe('function');
  });

  it('updates connectivity state when offline and online events fire', () => {
    const { result } = renderHook(() => usePwa());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.connectivity.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.connectivity.isOnline).toBe(true);
  });

  it('captures beforeinstallprompt event and enables install capability', async () => {
    const { result } = renderHook(() => usePwa());

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
    expect(result.current.install.canInstall).toBe(true);

    let installed = false;
    await act(async () => {
      installed = await result.current.install.promptInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(installed).toBe(true);
    expect(result.current.install.canInstall).toBe(false);
  });

  it('marks app as installed when appinstalled event fires', () => {
    const { result } = renderHook(() => usePwa());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.install.isInstalled).toBe(true);
    expect(result.current.install.canInstall).toBe(false);
  });

  it('invokes custom protocol navigation on openInApp', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { result } = renderHook(() => usePwa());

    act(() => {
      result.current.install.openInApp();
    });

    expect(clickSpy).toHaveBeenCalled();
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
      const { result } = renderHook(() => usePwa());
      expect(result.current.install.canInstall).toBe(true);

      let installed = false;
      await act(async () => {
        installed = await result.current.install.promptInstall();
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
      const { result } = renderHook(() => usePwa());

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
        installed = await result.current.install.promptInstall();
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
      const { result } = renderHook(() => usePwa());
      expect(result.current.install.isInstalled).toBe(true);
      expect(result.current.install.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.install.promptInstall();
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
      const { result } = renderHook(() => usePwa());
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.install.isInstalled).toBe(true);
      expect(result.current.install.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.install.promptInstall();
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
      const { result } = renderHook(() => usePwa());
      expect(result.current.install.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.install.promptInstall();
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

  it('disables canInstall and suppresses prompt on Firefox platforms', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      configurable: true,
    });

    try {
      const { result } = renderHook(() => usePwa());
      expect(result.current.install.canInstall).toBe(false);

      let installed = true;
      await act(async () => {
        installed = await result.current.install.promptInstall();
      });
      expect(installed).toBe(false);
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });

  it('surfaces update readiness when service worker signals onNeedRefresh', async () => {
    let capturedOptions: pwaRegister.PwaRegisterOptions | undefined;
    vi.spyOn(pwaRegister, 'registerPwa').mockImplementation((options) => {
      capturedOptions = options;
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => usePwa());

    expect(result.current.update.isUpdateAvailable).toBe(false);

    const mockReg = {
      waiting: {
        postMessage: vi.fn(),
      },
    } as unknown as ServiceWorkerRegistration;

    act(() => {
      capturedOptions?.onNeedRefresh?.(mockReg);
    });

    expect(result.current.update.isUpdateAvailable).toBe(true);

    const skipWaitingSpy = vi
      .spyOn(pwaRegister, 'skipWaitingAndReload')
      .mockImplementation(() => {});

    act(() => {
      result.current.update.applyUpdateAndReload();
    });

    expect(skipWaitingSpy).toHaveBeenCalledWith(mockReg);
    expect(result.current.update.isUpdating).toBe(true);

    act(() => {
      result.current.update.dismissUpdate();
    });

    expect(result.current.update.isUpdateAvailable).toBe(false);
  });
});
