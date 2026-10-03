import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPwa, skipWaitingAndReload } from './pwaRegister';

describe('pwaRegister', () => {
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
    const reg = await registerPwa();
    expect(reg).toBeNull();
  });

  it('unregisters dev service workers when running in development mode', async () => {
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

    const reg = await registerPwa();
    expect(reg).toBeNull();
    expect(getRegistrationsMock).toHaveBeenCalled();
    expect(unregisterMock).toHaveBeenCalledTimes(1);
  });

  it('handles dev unregistration errors gracefully without throwing', async () => {
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

    const reg = await registerPwa();
    expect(reg).toBeNull();
  });

  it('registers sw.js and fires onNeedRefresh when registration.waiting is active in PROD', async () => {
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

    const reg = await registerPwa({ onNeedRefresh });
    expect(reg).toBe(mockRegistration);
    expect(registerMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
    expect(onNeedRefresh).toHaveBeenCalledWith(mockRegistration);
  });

  it('fires onOfflineReady on initial install without existing controller in PROD', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);

    const onOfflineReady = vi.fn();
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
          controller: null, // First install, no active controller
        },
      },
      configurable: true,
      writable: true,
    });

    await registerPwa({ onOfflineReady });

    // Trigger updatefound -> statechange -> installed
    updateFoundListener?.();
    mockInstallingWorker.state = 'installed';
    stateChangeListener?.();

    expect(onOfflineReady).toHaveBeenCalledTimes(1);
  });

  it('fires onNeedRefresh when an update installs while a controller is active in PROD', async () => {
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
          controller: {} as ServiceWorker, // Active controller already present
        },
      },
      configurable: true,
      writable: true,
    });

    await registerPwa({ onNeedRefresh });

    updateFoundListener?.();
    mockInstallingWorker.state = 'installed';
    stateChangeListener?.();

    expect(onNeedRefresh).toHaveBeenCalledWith(mockRegistration);
  });

  it('catches registration errors, logs to console, and returns null', async () => {
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

    const reg = await registerPwa();
    expect(reg).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Service worker registration failed:',
      expect.any(Error),
    );
  });

  it('posts SKIP_WAITING to waiting worker and reloads on controllerchange', () => {
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

    skipWaitingAndReload(mockReg);
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(addEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function), {
      once: true,
    });

    // Simulate controllerchange
    controllerChangeHandler?.();
    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('does nothing when skipWaitingAndReload is called with no waiting worker', () => {
    const mockReg = {
      waiting: null,
    } as unknown as ServiceWorkerRegistration;

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

    skipWaitingAndReload(mockReg);
    expect(addEventListenerMock).not.toHaveBeenCalled();
  });
});
