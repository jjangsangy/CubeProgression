import { fireEvent, render, waitFor } from '@testing-library/react';
import { toCanvas, toPng } from 'html-to-image';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartCardWrapper } from './ChartCardWrapper';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
  toCanvas: vi.fn(),
}));

const ACTION_ID_SUFFIX: Record<string, string> = {
  'Download Plot as PNG Image': 'download',
  'Maximize to Fullscreen': 'maximize',
  'Restore View (Esc)': 'maximize',
};

const getButton = (label: string) =>
  document.querySelector(`[id$="-${ACTION_ID_SUFFIX[label]}"]`) as HTMLButtonElement;

describe('ChartCardWrapper component', () => {
  const sampleDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toPng).mockImplementation(async (node, options) => {
      const opts = options as { onClone?: (clonedNode: HTMLElement) => void } | undefined;
      if (opts?.onClone && node instanceof HTMLElement) {
        opts.onClone(node.cloneNode(true) as HTMLElement);
      }
      return sampleDataUrl;
    });
    vi.mocked(toCanvas).mockResolvedValue({
      toDataURL: () => sampleDataUrl,
    } as unknown as HTMLCanvasElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title, subtitle, badge, controls, and children', () => {
    const { container } = render(
      <ChartCardWrapper
        id="test-chart-card"
        title="Test Chart Title"
        subtitle="Test Chart Subtitle"
        headerBadge={<span id="test-badge">Badge</span>}
        headerControls={
          <button type="button" id="test-ctrl">
            Ctrl
          </button>
        }
      >
        <div id="test-chart-content">Chart Content</div>
      </ChartCardWrapper>,
    );

    const card = container.querySelector('#test-chart-card');
    expect(card).toBeInTheDocument();
    // Title renders as a heading, subtitle as a paragraph
    expect(card?.querySelector('h2')).toBeInTheDocument();
    expect(card?.querySelector('p')).toBeInTheDocument();
    // Badge, controls and children slots are rendered
    expect(card?.querySelector('#test-badge')).toBeInTheDocument();
    expect(card?.querySelector('#test-ctrl')).toBeInTheDocument();
    expect(card?.querySelector('#test-chart-content')).toBeInTheDocument();
  });

  it('renders correctly without subtitle or header controls', () => {
    const { container } = render(
      <ChartCardWrapper id="minimal-chart" title="Minimal Chart">
        <div id="minimal-content">Content</div>
      </ChartCardWrapper>,
    );

    const card = container.querySelector('#minimal-chart');
    expect(card).toBeInTheDocument();
    expect(card?.querySelector('h2')).toBeInTheDocument();
    // No subtitle paragraph and no secondary controls toolbar
    expect(card?.querySelector('p')).toBeNull();
    expect(card?.querySelector('#minimal-content')).toBeInTheDocument();
  });

  it('renders responsive mobile and desktop subtitle spans when mobileSubtitle is provided', () => {
    const { container } = render(
      <ChartCardWrapper
        id="subtitle-chart"
        title="Test Title"
        subtitle="Desktop Subtitle"
        mobileSubtitle="Mobile Subtitle"
      >
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const subtitleSpans = container.querySelectorAll('#subtitle-chart p > span');
    expect(subtitleSpans).toHaveLength(2);
    expect(subtitleSpans[0]).toHaveClass('sm:hidden');
    expect(subtitleSpans[1]).toHaveClass('hidden', 'sm:inline');
  });

  it('renders mobileSubtitle alone when subtitle is omitted', () => {
    const { container } = render(
      <ChartCardWrapper
        id="mobile-only-chart"
        title="Test Title"
        mobileSubtitle="Mobile Only Subtitle"
      >
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const subtitleSpans = container.querySelectorAll('#mobile-only-chart p > span');
    expect(subtitleSpans).toHaveLength(1);
    expect(subtitleSpans[0]).toHaveClass('sm:hidden');
  });

  it('toggles maximize/fullscreen mode and manages body overflow and escape key', () => {
    render(
      <ChartCardWrapper title="Test Chart Title">
        <div>Chart Content</div>
      </ChartCardWrapper>,
    );

    expect(document.body.style.overflow).toBe('');
    const maxBtn = getButton('Maximize to Fullscreen');
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(document.body.style.overflow).toBe('hidden');
    expect(getButton('Restore View (Esc)')).toBeInTheDocument();

    // Clicking minimize button restores view
    const restoreBtn = getButton('Restore View (Esc)');
    fireEvent.click(restoreBtn);
    expect(document.body.style.overflow).toBe('');

    // Maximizing again and pressing Escape
    fireEvent.click(getButton('Maximize to Fullscreen'));
    expect(document.body.style.overflow).toBe('hidden');
    // Non-escape key does not restore view
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
    expect(getButton('Maximize to Fullscreen')).toBeInTheDocument();

    // Pressing Escape while already not maximized does nothing
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  it('prevents concurrent download attempts while download is in progress', async () => {
    let resolvePng: (val: string) => void = () => {};
    const pendingPromise = new Promise<string>((res) => {
      resolvePng = res;
    });
    vi.mocked(toPng).mockReturnValue(pendingPromise);

    render(
      <ChartCardWrapper title="Test Concurrent">
        <div>Content</div>
      </ChartCardWrapper>,
    );

    const pngBtn = getButton('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    // Clicking again immediately while downloading is ignored
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalledTimes(1);
    });

    resolvePng(sampleDataUrl);
    await waitFor(() => {
      expect(getButton('Download Plot as PNG Image')).not.toBeDisabled();
    });
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

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
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
      <ChartCardWrapper id="scrollable-chart-card" title="Scrollable Chart">
        <div className="scrollable-inner" style={{ width: 100, height: 100 }}>
          Scrollable Content
        </div>
      </ChartCardWrapper>,
    );

    const inner = container.querySelector(
      '#scrollable-chart-card .scrollable-inner',
    ) as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientWidth', { value: 100, configurable: true });
    Object.defineProperty(inner, 'scrollHeight', { value: 300, configurable: true });
    Object.defineProperty(inner, 'clientHeight', { value: 100, configurable: true });

    const pngBtn = getButton('Download Plot as PNG Image');
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

    const pngBtn = getButton('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export chart image:', expect.any(Error));
    });
  });

  it('hides button text labels on mobile screens using hidden sm:inline and sets accessible aria-labels', () => {
    const { container } = render(
      <ChartCardWrapper id="responsive-header-chart" title="Responsive Header Chart">
        <div>Chart Content</div>
      </ChartCardWrapper>,
    );

    const downloadBtn = container.querySelector('[id$="-download"]');
    const pngLabel = downloadBtn?.querySelector('span');
    expect(pngLabel).toHaveClass('hidden');
    expect(pngLabel).toHaveClass('sm:inline');

    const maxBtn = container.querySelector('[id$="-maximize"]');
    const maxLabel = maxBtn?.querySelector('span');
    expect(maxLabel).toHaveClass('hidden');
    expect(maxLabel).toHaveClass('sm:inline');

    // Both action buttons expose an accessible name (for icon-only mobile view)
    expect(downloadBtn).toHaveAttribute('aria-label');
    expect(maxBtn).toHaveAttribute('aria-label');
  });

  it('applies responsive padding classes to the card and fullscreen backdrop', () => {
    const { container } = render(
      <ChartCardWrapper id="padding-test-chart" title="Padding Test Chart">
        <div>Chart Content</div>
      </ChartCardWrapper>,
    );

    const card = container.querySelector('#padding-test-chart') as HTMLElement;
    expect(card).toHaveClass('p-4');
    expect(card).toHaveClass('sm:p-6');

    // Maximize to check fullscreen backdrop padding
    fireEvent.click(getButton('Maximize to Fullscreen'));
    const backdrop = document.querySelector('#chart-card-fullscreen-backdrop');
    expect(backdrop).toHaveClass('p-4');
    expect(backdrop).toHaveClass('sm:p-8');
  });

  it('applies explicit width and height to recharts wrappers and svgs during cloning', async () => {
    let capturedClonedNode: HTMLElement | null = null;
    vi.mocked(toPng).mockImplementation(async (node, options) => {
      const opts = options as { onClone?: (clonedNode: HTMLElement) => void } | undefined;
      if (opts?.onClone && node instanceof HTMLElement) {
        capturedClonedNode = node.cloneNode(true) as HTMLElement;
        opts.onClone(capturedClonedNode);
      }
      return sampleDataUrl;
    });

    const { container } = render(
      <ChartCardWrapper title="Clone Dimensions Test">
        <div className="recharts-wrapper">
          <svg />
        </div>
      </ChartCardWrapper>,
    );

    const rechartsWrapper = container.querySelector('.recharts-wrapper');
    expect(rechartsWrapper).not.toBeNull();
    vi.spyOn(rechartsWrapper as Element, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const svgEl = container.querySelector('.recharts-wrapper svg');
    expect(svgEl).not.toBeNull();
    vi.spyOn(svgEl as Element, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const pngBtn = getButton('Download Plot as PNG Image');
    fireEvent.click(pngBtn);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
    });

    expect(capturedClonedNode).not.toBeNull();
    const clonedWrapper = (capturedClonedNode as unknown as HTMLElement).querySelector(
      '.recharts-wrapper',
    ) as HTMLElement;
    expect(clonedWrapper.style.width).toBe('500px');
    expect(clonedWrapper.style.height).toBe('300px');
    expect(clonedWrapper.style.minWidth).toBe('500px');
    expect(clonedWrapper.style.minHeight).toBe('300px');

    const clonedSvg = clonedWrapper.querySelector('svg') as SVGElement;
    expect(clonedSvg).not.toBeNull();
    expect(clonedSvg.getAttribute('width')).toBe('500');
    expect(clonedSvg.getAttribute('height')).toBe('300');
    expect(clonedSvg.style.width).toBe('500px');
    expect(clonedSvg.style.height).toBe('300px');
  });
});
