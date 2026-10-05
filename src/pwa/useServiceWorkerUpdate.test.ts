import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerServiceWorker,
  resetServiceWorkerUpdateForTesting,
  skipWaitingAndReload,
  useServiceWorkerUpdate,
} from './useServiceWorkerUpdate';

describe('registerServiceWorker', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('returns null gracefully when navigator.serviceWorker is not supported', async () => {
    const reg = await registerServiceWorker(vi.fn());
    expect(reg).toBeNull();
  });

  it('unregisters dev service workers when running in development mode', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);

    const unregisterMock = vi.fn().mockResolvedValue(true);
    const mockRegistration = { unregister: unregisterMock } as unknown as ServiceWorkerRegistration;
    const getRegistrationsMock = vi.fn().mockResolvedValue([mockRegistration]);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          getRegistrations: getRegistrationsMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const reg = await registerServiceWorker(vi.fn());
    expect(reg).toBeNull();
    expect(getRegistrationsMock).toHaveBeenCalled();
    expect(unregisterMock).toHaveBeenCalledTimes(1);
  });

  it('handles dev unregistration errors gracefully without throwing', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          getRegistrations: vi.fn().mockRejectedValue(new Error('Dev SW unregistration error')),
        },
      },
      configurable: true,
      writable: true,
    });

    const reg = await registerServiceWorker(vi.fn());
    expect(reg).toBeNull();
  });

  it('registers sw.js and signals readiness when registration.waiting is active in PROD', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const onNeedRefresh = vi.fn();
    const mockWaitingWorker = {} as ServiceWorker;
    const mockRegistration = {
      waiting: mockWaitingWorker,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: registerMock,
          controller: {} as ServiceWorker,
        },
      },
      configurable: true,
      writable: true,
    });

    const reg = await registerServiceWorker(onNeedRefresh);
    expect(reg).toBe(mockRegistration);
    expect(registerMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
    expect(onNeedRefresh).toHaveBeenCalledWith(mockRegistration);
  });

  it('signals readiness when an update finishes installing while a controller is active', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const onNeedRefresh = vi.fn();
    let updateFoundListener: (() => void) | undefined;
    let stateChangeListener: (() => void) | undefined;

    const mockInstallingWorker = {
      state: 'installing',
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'statechange') stateChangeListener = cb;
      }),
    };

    const mockRegistration = {
      waiting: null,
      installing: mockInstallingWorker,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'updatefound') updateFoundListener = cb;
      }),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          controller: {} as ServiceWorker,
        },
      },
      configurable: true,
      writable: true,
    });

    await registerServiceWorker(onNeedRefresh);

    updateFoundListener?.();
    mockInstallingWorker.state = 'installed';
    stateChangeListener?.();

    expect(onNeedRefresh).toHaveBeenCalledWith(mockRegistration);
  });

  it('does not signal readiness on first install when there is no active controller', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const onNeedRefresh = vi.fn();
    let updateFoundListener: (() => void) | undefined;
    let stateChangeListener: (() => void) | undefined;

    const mockInstallingWorker = {
      state: 'installing',
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'statechange') stateChangeListener = cb;
      }),
    };

    const mockRegistration = {
      waiting: null,
      installing: mockInstallingWorker,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'updatefound') updateFoundListener = cb;
      }),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          controller: null,
        },
      },
      configurable: true,
      writable: true,
    });

    await registerServiceWorker(onNeedRefresh);

    updateFoundListener?.();
    mockInstallingWorker.state = 'installed';
    stateChangeListener?.();

    expect(onNeedRefresh).not.toHaveBeenCalled();
  });

  it('catches registration errors, logs them, and returns null', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: vi.fn().mockRejectedValue(new Error('Network error during registration')),
        },
      },
      configurable: true,
      writable: true,
    });

    const reg = await registerServiceWorker(vi.fn());
    expect(reg).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Service worker registration failed:',
      expect.any(Error),
    );
  });
});

describe('skipWaitingAndReload', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('posts SKIP_WAITING to the waiting worker and reloads on controllerchange', () => {
    const postMessageMock = vi.fn();
    const mockWaiting = {
      postMessage: postMessageMock,
    } as unknown as ServiceWorker;

    const mockReg = {
      waiting: mockWaiting,
    } as unknown as ServiceWorkerRegistration;

    let controllerChangeHandler: (() => void) | undefined;
    const addEventListenerMock = vi.fn(
      (event: string, cb: () => void, _options?: AddEventListenerOptions) => {
        if (event === 'controllerchange') {
          controllerChangeHandler = cb;
        }
      },
    );

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          addEventListener: addEventListenerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const originalLocation = window.location;
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadMock },
      configurable: true,
      writable: true,
    });

    try {
      skipWaitingAndReload(mockReg);
      expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(addEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function), {
        once: true,
      });

      controllerChangeHandler?.();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('does nothing when there is no waiting worker', () => {
    const addEventListenerMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          addEventListener: addEventListenerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    skipWaitingAndReload({ waiting: null } as unknown as ServiceWorkerRegistration);
    expect(addEventListenerMock).not.toHaveBeenCalled();
  });
});

describe('useServiceWorkerUpdate', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    resetServiceWorkerUpdateForTesting();
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    resetServiceWorkerUpdateForTesting();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('exposes an idle update interface with a pending registration', async () => {
    const registerMock = vi.fn().mockResolvedValue({
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: { register: registerMock },
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(typeof result.current.applyUpdateAndReload).toBe('function');
    expect(typeof result.current.dismissUpdate).toBe('function');

    await waitFor(() => expect(registerMock).toHaveBeenCalled());
  });

  it('surfaces update readiness and applies the atomic reload', async () => {
    const postMessageMock = vi.fn();
    const waitingWorker = { postMessage: postMessageMock } as unknown as ServiceWorker;
    const mockRegistration = {
      waiting: waitingWorker,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          controller: {} as ServiceWorker,
          addEventListener: vi.fn(),
        },
      },
      configurable: true,
      writable: true,
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: vi.fn() },
      configurable: true,
      writable: true,
    });

    try {
      const { result } = renderHook(() => useServiceWorkerUpdate());

      await waitFor(() => expect(result.current.isUpdateAvailable).toBe(true));

      act(() => {
        result.current.applyUpdateAndReload();
      });

      expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(result.current.isUpdating).toBe(true);

      act(() => {
        result.current.dismissUpdate();
      });

      expect(result.current.isUpdateAvailable).toBe(false);
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });
});
