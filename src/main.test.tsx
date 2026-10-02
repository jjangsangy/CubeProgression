import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp, mountApp } from './main';
import * as temporalLoader from './utils/temporalLoader';

describe('main entrypoint mountApp and bootstrapApp', () => {
  let container: HTMLDivElement;
  let activeRoot: ReturnType<typeof mountApp> = null;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (activeRoot) {
      await act(async () => {
        activeRoot?.unmount();
      });
      activeRoot = null;
    }
    container?.remove();
    vi.restoreAllMocks();
  });

  it('returns null when container is null', () => {
    const root = mountApp(null);
    expect(root).toBeNull();
  });

  it('mounts App into provided container element', async () => {
    await act(async () => {
      activeRoot = mountApp(container);
    });

    expect(activeRoot).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');
  });

  it('defaults to querying document.getElementById("root") when no container is passed', async () => {
    await act(async () => {
      activeRoot = mountApp();
    });

    expect(activeRoot).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');
  });

  it('bootstrapApp ensures temporal and mounts app into container', async () => {
    const ensureSpy = vi.spyOn(temporalLoader, 'ensureTemporal');
    await act(async () => {
      activeRoot = await bootstrapApp(container);
    });

    expect(ensureSpy).toHaveBeenCalled();
    expect(activeRoot).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');
  });

  it('bootstrapApp defaults to querying document.getElementById("root") when no container is passed', async () => {
    const ensureSpy = vi.spyOn(temporalLoader, 'ensureTemporal');
    await act(async () => {
      activeRoot = await bootstrapApp();
    });

    expect(ensureSpy).toHaveBeenCalled();
    expect(activeRoot).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');
  });

  it('bootstrapApp returns null when container is null without calling ensureTemporal', async () => {
    const ensureSpy = vi.spyOn(temporalLoader, 'ensureTemporal');
    await act(async () => {
      activeRoot = await bootstrapApp(null);
    });

    expect(ensureSpy).not.toHaveBeenCalled();
    expect(activeRoot).toBeNull();
  });
});
