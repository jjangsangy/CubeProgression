import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toCanvas, toPng } from 'html-to-image';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartCardWrapper } from './ChartCardWrapper';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
  toCanvas: vi.fn(),
}));

describe('ChartCardWrapper component', () => {
  const sampleDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toPng).mockResolvedValue(sampleDataUrl);
    vi.mocked(toCanvas).mockResolvedValue({
      toDataURL: () => sampleDataUrl,
    } as unknown as HTMLCanvasElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title, subtitle, badge, controls, and children', () => {
    render(
      <ChartCardWrapper
        title="Test Chart Title"
        subtitle="Test Chart Subtitle"
        headerBadge={<span data-testid="badge">Badge</span>}
        headerControls={
          <button type="button" data-testid="ctrl">
            Ctrl
          </button>
        }
      >
        <div data-testid="chart-content">Chart Content</div>
      </ChartCardWrapper>,
    );

    expect(screen.getByText('Test Chart Title')).toBeInTheDocument();
    expect(screen.getByText('Test Chart Subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByTestId('ctrl')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('renders correctly without subtitle or header controls', () => {
    render(
      <ChartCardWrapper title="Minimal Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    expect(screen.getByText('Minimal Chart')).toBeInTheDocument();
    expect(screen.queryByTestId('ctrl')).not.toBeInTheDocument();
  });

  it('toggles maximize/fullscreen mode and manages body overflow and escape key', () => {
    render(
      <ChartCardWrapper title="Test Chart Title">
        <div>Chart Content</div>
      </ChartCardWrapper>,
    );

    expect(document.body.style.overflow).toBe('');
    const maxBtn = screen.getByTitle('Maximize to Fullscreen');
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTitle('Restore View (Esc)')).toBeInTheDocument();

    // Clicking minimize button restores view
    const restoreBtn = screen.getByTitle('Restore View (Esc)');
    fireEvent.click(restoreBtn);
    expect(document.body.style.overflow).toBe('');

    // Maximizing again and pressing Escape
    fireEvent.click(screen.getByTitle('Maximize to Fullscreen'));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByTitle('Maximize to Fullscreen')).toBeInTheDocument();
  });

  it('triggers PNG image export download with base64 dataUrl and onClone / filter hooks', async () => {
    let capturedOptions:
      | {
          filter?: (node: Node) => boolean;
          onClone?: (node: HTMLElement) => void;
        }
      | undefined;

    vi.mocked(toPng).mockImplementation(async (_el, options) => {
      capturedOptions = options as typeof capturedOptions;
      return sampleDataUrl;
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    const { container } = render(
      <ChartCardWrapper title="Speed Progression Plot">
        <div className="recharts-wrapper" style={{ width: 400, height: 200 }}>
          <svg role="img" aria-label="SVG Content" width={400} height={200}>
            <text>SVG Content</text>
          </svg>
        </div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    expect(toPng).toHaveBeenCalled();
    expect(capturedOptions).toBeDefined();

    // Verify filter function: filters out elements with .export-exclude
    if (capturedOptions?.filter) {
      const excludedEl = document.createElement('div');
      excludedEl.classList.add('export-exclude');
      const normalEl = document.createElement('div');
      expect(capturedOptions.filter(excludedEl)).toBe(false);
      expect(capturedOptions.filter(normalEl)).toBe(true);
    }

    // Verify onClone function adjusts clones
    if (capturedOptions?.onClone) {
      const cloned = container.cloneNode(true) as HTMLElement;
      // Mock getBoundingClientRect
      const liveWrapper = container.querySelector('.recharts-wrapper') as HTMLElement;
      if (liveWrapper) {
        liveWrapper.getBoundingClientRect = () => ({
          width: 400,
          height: 200,
          top: 0,
          left: 0,
          bottom: 200,
          right: 400,
          x: 0,
          y: 0,
          toJSON: () => {},
        });
      }
      const liveSvg = container.querySelector('svg') as SVGElement;
      if (liveSvg) {
        liveSvg.getBoundingClientRect = () => ({
          width: 400,
          height: 200,
          top: 0,
          left: 0,
          bottom: 200,
          right: 400,
          x: 0,
          y: 0,
          toJSON: () => {},
        });
      }

      capturedOptions.onClone(cloned);
      expect(cloned.style.overflow).toBe('visible');
    }
  });

  it('handles non-base64 dataUrl download', async () => {
    vi.mocked(toPng).mockResolvedValue('https://example.com/chart.png');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(
      <ChartCardWrapper title="Non-data URL Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  it('retries with pixelRatio 1 when primary toPng fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(toPng)
      .mockRejectedValueOnce(new Error('High DPI failure'))
      .mockResolvedValueOnce(sampleDataUrl);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(
      <ChartCardWrapper title="Retry Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    expect(toPng).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      'Primary toPng failed, retrying with pixelRatio 1:',
      expect.any(Error),
    );
  });

  it('retries with toCanvas when secondary toPng fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(toPng)
      .mockRejectedValueOnce(new Error('Primary failed'))
      .mockRejectedValueOnce(new Error('Secondary failed'));

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    render(
      <ChartCardWrapper title="Canvas Fallback Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    expect(toCanvas).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Primary toPng failed, retrying with pixelRatio 1:',
      expect.any(Error),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Secondary toPng failed, retrying with toCanvas:',
      expect.any(Error),
    );
  });

  it('shows alert when all PNG generation attempts fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(toPng)
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'));
    vi.mocked(toCanvas).mockRejectedValueOnce(new Error('Fail 3'));

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ChartCardWrapper title="Failed Export Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not export PNG image. Please check browser permissions.',
      );
    });
    expect(errorSpy).toHaveBeenCalledWith('All PNG generation attempts failed:', expect.any(Error));
  });

  it('handles download error gracefully in triggerBlobDownload fallback', async () => {
    vi.mocked(toPng).mockResolvedValue(sampleDataUrl);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock document.body.appendChild to throw on first call to trigger error branch in triggerBlobDownload
    const originalAppend = document.body.appendChild.bind(document.body);
    let throwOnce = true;
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (throwOnce && (node as HTMLElement).tagName === 'A') {
        throwOnce = false;
        throw new Error('Append error');
      }
      return originalAppend(node);
    });

    render(
      <ChartCardWrapper title="Error Fallback Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error triggering download:', expect.any(Error));
    });
  });

  it('expands export dimensions to include scrollable inner elements', async () => {
    let capturedOptions: { width?: number; height?: number } | undefined;
    vi.mocked(toPng).mockImplementation(async (_el, options) => {
      capturedOptions = options as { width?: number; height?: number };
      return sampleDataUrl;
    });

    const { container } = render(
      <ChartCardWrapper title="Scrollable Chart">
        <div data-testid="scrollable-inner" style={{ width: 100, height: 100 }}>
          Scrollable Content
        </div>
      </ChartCardWrapper>,
    );

    const inner = container.querySelector('[data-testid="scrollable-inner"]') as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(inner, 'scrollHeight', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientHeight', { value: 100, configurable: true });

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
    });

    // The scrollable child needs 300px + 32px of padding, which exceeds the (zero-sized) card in jsdom
    expect(capturedOptions?.width).toBe(332);
    expect(capturedOptions?.height).toBe(332);
  });

  it('handles unexpected thrown exceptions in handleDownloadImage', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementationOnce(() => {
      throw new Error('Fatal layout error');
    });

    render(
      <ChartCardWrapper title="Fatal Error Chart">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export chart image:', expect.any(Error));
    });
  });
});
