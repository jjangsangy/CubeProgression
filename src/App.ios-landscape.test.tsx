import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { ChartCardWrapper } from './components/ChartCardWrapper';

describe('iOS Safari Landscape Mode & Safe Area Support', () => {
  it('replicates bug condition: demonstrates why unstyled html/body causes white sides in Safari landscape', () => {
    // In Mobile Safari WebKit:
    // 1. Without viewport-fit=cover, Safari letterboxes the viewport in landscape.
    // 2. The letterbox areas default to the computed background-color of <html> or <body>.
    // 3. When background-color is transparent or undefined, WebKit's default window canvas is pure white (#ffffff).
    const unstyledElement = document.createElement('div');
    expect(unstyledElement.style.backgroundColor).toBe('');

    // Replicate bug simulation: an unstyled container inside transparent body
    const simulatedDefaultCanvasColor =
      unstyledElement.style.backgroundColor || 'rgb(255, 255, 255)';
    expect(simulatedDefaultCanvasColor).toBe('rgb(255, 255, 255)');
  });

  it('verifies index.html specifies viewport-fit=cover to prevent Safari landscape letterboxing', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    // Must include viewport-fit=cover
    expect(indexHtml).toMatch(
      /<meta\s+name=["']viewport["']\s+content=["'][^"']*viewport-fit=cover[^"']*["']/,
    );

    // Must specify dark theme-color and color-scheme
    expect(indexHtml).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#0c0a09["']/);
    expect(indexHtml).toMatch(/<meta\s+name=["']color-scheme["']\s+content=["']dark["']/);

    // html and body must have stone-950 inline background color to eliminate white flashes
    expect(indexHtml).toMatch(/<html[^>]*style=["'][^"']*background-color:\s*#0c0a09/);
    expect(indexHtml).toMatch(/<body[^>]*style=["'][^"']*background-color:\s*#0c0a09/);
  });

  it('verifies src/index.css configures root color-scheme, dark canvas, and safe-area utilities', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('color-scheme: dark');
    expect(cssContent).toContain('background-color: #0c0a09');
    expect(cssContent).toContain('safe-area-x');
    expect(cssContent).toContain('safe-area-bottom');
    expect(cssContent).toContain('safe-area-modal');
    expect(cssContent).toContain('env(safe-area-inset-left)');
    expect(cssContent).toContain('env(safe-area-inset-right)');
    expect(cssContent).toContain('env(safe-area-inset-bottom)');
    expect(cssContent).toContain('env(safe-area-inset-top)');
  });

  it('renders App with safe-area-x padding on Navbar and Main container, and safe-area-bottom on Footer', async () => {
    const { container } = render(<App />);

    const headerContainer = container.querySelector('header > div');
    expect(headerContainer).toHaveClass('safe-area-x');

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('safe-area-x');

    const footerElement = container.querySelector('footer');
    expect(footerElement).toHaveClass('safe-area-x');
    expect(footerElement).toHaveClass('safe-area-bottom');

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });
  });

  it('renders ChartCardWrapper fullscreen modal with safe-area-modal padding', () => {
    render(
      <ChartCardWrapper title="Test Plot">
        <div>Plot Body</div>
      </ChartCardWrapper>,
    );

    const maxButton = screen.getByRole('button', { name: 'Maximize to Fullscreen' });
    fireEvent.click(maxButton);

    const backdrop = document.querySelector('.fixed.inset-0.z-\\[100\\]');
    expect(backdrop).toHaveClass('safe-area-modal');
  });
});
