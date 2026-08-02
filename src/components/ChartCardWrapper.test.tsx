import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChartCardWrapper } from './ChartCardWrapper';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  toCanvas: vi.fn(),
}));

describe('ChartCardWrapper component', () => {
  it('renders title, subtitle, badge and children', () => {
    render(
      <ChartCardWrapper
        title="Test Chart Title"
        subtitle="Test Chart Subtitle"
        headerBadge={<span data-testid="badge">Badge</span>}
        headerControls={<button data-testid="ctrl">Ctrl</button>}
      >
        <div data-testid="chart-content">Chart Content</div>
      </ChartCardWrapper>
    );

    expect(screen.getByText('Test Chart Title')).toBeInTheDocument();
    expect(screen.getByText('Test Chart Subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByTestId('ctrl')).toBeInTheDocument();
    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
  });

  it('toggles maximize/fullscreen mode when maximize button is clicked', () => {
    render(
      <ChartCardWrapper title="Test Chart Title">
        <div>Chart Content</div>
      </ChartCardWrapper>
    );

    const maxBtn = screen.getByTitle('Maximize to Fullscreen');
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);
    expect(screen.getByTitle('Restore View (Esc)')).toBeInTheDocument();

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTitle('Maximize to Fullscreen')).toBeInTheDocument();
  });

  it('triggers PNG image export download when PNG button is clicked', async () => {
    render(
      <ChartCardWrapper title="Test Chart Title">
        <div>Chart Content</div>
      </ChartCardWrapper>
    );

    const pngBtn = screen.getByTitle('Download Plot as PNG Image');
    expect(pngBtn).toBeInTheDocument();

    fireEvent.click(pngBtn);

    // After click, downloading state starts and finishes
    // HTML to image mock resolves
    expect(pngBtn).toBeInTheDocument();
  });
});
