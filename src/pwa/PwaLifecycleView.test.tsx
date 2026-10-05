import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext';
import { PwaLifecycleView } from './PwaLifecycleView';
import type { PwaUpdateState } from './types';
import { resetServiceWorkerUpdateForTesting } from './useServiceWorkerUpdate';

describe('PwaLifecycleView presentation module', () => {
  beforeEach(() => {
    resetServiceWorkerUpdateForTesting();
    vi.restoreAllMocks();
  });

  it('renders the pwa-install bridge element and hides update toast when no update is available', () => {
    const { container } = render(
      <ThemeProvider>
        <PwaLifecycleView />
      </ThemeProvider>,
    );

    const bridgeEl = container.querySelector('#pwa-install');
    expect(bridgeEl).toBeInTheDocument();

    const updateToast = container.querySelector('#pwa-update-toast');
    expect(updateToast).toBeNull();
  });

  it('renders update toast with status role and action buttons when update is available', () => {
    const applyUpdateAndReload = vi.fn();
    const dismissUpdate = vi.fn();

    const mockUpdate: PwaUpdateState = {
      isUpdateAvailable: true,
      isUpdating: false,
      applyUpdateAndReload,
      dismissUpdate,
    };

    const { container } = render(
      <ThemeProvider>
        <PwaLifecycleView updateOverride={mockUpdate} />
      </ThemeProvider>,
    );

    const updateToast = container.querySelector('#pwa-update-toast');
    expect(updateToast).toBeInTheDocument();
    expect(updateToast).toHaveAttribute('role', 'status');

    const reloadBtn = container.querySelector('#pwa-update-reload-btn');
    expect(reloadBtn).toBeInTheDocument();
    expect(reloadBtn).not.toBeDisabled();

    if (reloadBtn) fireEvent.click(reloadBtn);
    expect(applyUpdateAndReload).toHaveBeenCalledTimes(1);

    const dismissBtn = container.querySelector('#pwa-update-dismiss-btn');
    expect(dismissBtn).toBeInTheDocument();

    if (dismissBtn) fireEvent.click(dismissBtn);
    expect(dismissUpdate).toHaveBeenCalledTimes(1);
  });

  it('disables update reload button when updating is in flight', () => {
    const mockUpdate: PwaUpdateState = {
      isUpdateAvailable: true,
      isUpdating: true,
      applyUpdateAndReload: vi.fn(),
      dismissUpdate: vi.fn(),
    };

    const { container } = render(
      <ThemeProvider>
        <PwaLifecycleView updateOverride={mockUpdate} />
      </ThemeProvider>,
    );

    const reloadBtn = container.querySelector('#pwa-update-reload-btn');
    expect(reloadBtn).toBeInTheDocument();
    expect(reloadBtn).toBeDisabled();
  });
});
