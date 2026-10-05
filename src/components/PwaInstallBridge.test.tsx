import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext';
import { PwaInstallBridge } from './PwaInstallBridge';

describe('PwaInstallBridge component', () => {
  it('renders pwa-install element with default props and attributes', () => {
    const { container } = render(
      <ThemeProvider>
        <PwaInstallBridge />
      </ThemeProvider>,
    );

    const el = container.querySelector('#pwa-install') as
      | (HTMLElement & {
          name?: string;
          icon?: string;
          description?: string;
        })
      | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute('manual-apple')).toBe('true');
    expect(el?.getAttribute('manual-chrome')).toBe('true');
    expect(el?.getAttribute('manual-how-to')).toBe('true');
    expect(el?.name || el?.getAttribute('name')).toBe('CubeProgression');
    expect(el?.getAttribute('manifest-url')).toContain('manifest.webmanifest');
    expect(el?.icon || el?.getAttribute('icon')).toContain('favicon.svg');
  });

  it('accepts custom manifestUrl, icon, name, and description props', () => {
    const { container } = render(
      <ThemeProvider>
        <PwaInstallBridge
          manifestUrl="/custom-manifest.json"
          icon="/custom-icon.png"
          name="CustomCube"
          description="Custom Description"
        />
      </ThemeProvider>,
    );

    const el = container.querySelector('#pwa-install') as
      | (HTMLElement & {
          name?: string;
          icon?: string;
          description?: string;
        })
      | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute('manifest-url')).toBe('/custom-manifest.json');
    expect(el?.icon || el?.getAttribute('icon')).toBe('/custom-icon.png');
    expect(el?.name || el?.getAttribute('name')).toBe('CustomCube');
    expect(el?.description || el?.getAttribute('description')).toBe('Custom Description');
  });

  it('applies theme tint color to pwa-install styles', () => {
    const { container } = render(
      <ThemeProvider>
        <PwaInstallBridge />
      </ThemeProvider>,
    );

    const el = container.querySelector('#pwa-install') as
      | (HTMLElement & {
          styles?: Record<string, string>;
        })
      | null;
    expect(el).not.toBeNull();
    expect(el?.styles).toBeDefined();
    expect(el?.styles?.['--tint-color']).toBeTruthy();
  });
});
