import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from './main';

describe('main entrypoint mountApp', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    return () => {
      container.remove();
      vi.restoreAllMocks();
    };
  });

  it('returns null when container is null', () => {
    const root = mountApp(null);
    expect(root).toBeNull();
  });

  it('mounts App into provided container element', async () => {
    let root: ReturnType<typeof mountApp> = null;
    act(() => {
      root = mountApp(container);
    });

    expect(root).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');

    act(() => {
      root?.unmount();
    });
  });

  it('defaults to querying document.getElementById("root") when no container is passed', async () => {
    let root: ReturnType<typeof mountApp> = null;
    act(() => {
      root = mountApp();
    });

    expect(root).not.toBeNull();
    expect(container.innerHTML).toContain('CubeProgression');

    act(() => {
      root?.unmount();
    });
  });
});
