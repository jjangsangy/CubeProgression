import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../types';
import { FileUploader } from './FileUploader';

const mockSessions: Session[] = [
  {
    id: 's1',
    name: 'Main Session',
    solves: [
      {
        id: 1,
        index: 1,
        timeMs: 12000,
        rawTimeSec: 12,
        finalTimeSec: 12,
        penalty: 'OK',
        timestamp: 1600000000000,
        date: Temporal.PlainDate.from('2020-09-13'),
        dateStr: '2020-09-13',
      },
    ],
  },
  {
    id: 's2',
    name: 'OH Session',
    solves: [],
  },
];

describe('FileUploader component', () => {
  it('renders sessions dropdown and period grouping buttons', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        errorMsg={null}
      />,
    );

    const uploader = container.querySelector('#file-uploader');
    expect(uploader).toBeInTheDocument();
    const select = uploader?.querySelector('#session-selector');
    expect(select?.querySelectorAll('option')).toHaveLength(2);
    expect(uploader?.querySelector('#grouping-daily')).toBeInTheDocument();
    expect(uploader?.querySelector('#grouping-weekly')).toBeInTheDocument();
  });

  it('handles selecting session', () => {
    const onSelectSession = vi.fn();
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={onSelectSession}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
      />,
    );

    const select = container.querySelector('#file-uploader #session-selector') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 's2' } });
    expect(onSelectSession).toHaveBeenCalledWith('s2');
  });

  it('handles changing grouping period and batch size', () => {
    const onChangeGrouping = vi.fn();
    const onChangeCustomBatchSize = vi.fn();

    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="customBatch"
        onChangeGrouping={onChangeGrouping}
        customBatchSize={50}
        onChangeCustomBatchSize={onChangeCustomBatchSize}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
      />,
    );

    const weeklyBtn = container.querySelector('#grouping-weekly');
    expect(weeklyBtn).toBeInTheDocument();
    if (weeklyBtn) fireEvent.click(weeklyBtn);
    expect(onChangeGrouping).toHaveBeenCalledWith('weekly');

    // Preset button for batch size
    const preset25Btn = container.querySelector('#batch-preset-25');
    expect(preset25Btn).toBeInTheDocument();
    if (preset25Btn) fireEvent.click(preset25Btn);
    expect(onChangeCustomBatchSize).toHaveBeenCalledWith(25);
  });

  it('handles changing custom batch size input with valid and invalid values', () => {
    const onChangeCustomBatchSize = vi.fn();

    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="customBatch"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={onChangeCustomBatchSize}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
      />,
    );

    const input = container.querySelector(
      '#file-uploader input[type="number"]',
    ) as HTMLInputElement;
    expect(input).toHaveValue(50);

    // Valid change
    fireEvent.change(input, { target: { value: '75' } });
    expect(onChangeCustomBatchSize).toHaveBeenCalledWith(75);

    // Invalid / zero value
    onChangeCustomBatchSize.mockClear();
    fireEvent.change(input, { target: { value: '0' } });
    expect(onChangeCustomBatchSize).not.toHaveBeenCalled();

    // Invalid / NaN value
    fireEvent.change(input, { target: { value: '' } });
    expect(onChangeCustomBatchSize).not.toHaveBeenCalled();
  });

  it('handles drag and drop events on file dropzone', () => {
    const onFileUpload = vi.fn();

    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={onFileUpload}
        onLoadDemo={vi.fn()}
      />,
    );

    const dropzone = container.querySelector('#file-dropzone') as HTMLElement;

    // Drag over
    fireEvent.dragOver(dropzone);

    // Drag leave
    fireEvent.dragLeave(dropzone);

    // Drop empty
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [] },
    });
    expect(onFileUpload).not.toHaveBeenCalled();

    // Drop with a file
    const file = new File(['{"session1": []}'], 'cstimer.txt', { type: 'text/plain' });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });
    expect(onFileUpload).toHaveBeenCalledWith(file);
  });

  it('handles file input change and click to browse button', () => {
    const onFileUpload = vi.fn();

    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={onFileUpload}
        onLoadDemo={vi.fn()}
      />,
    );

    const file = new File(['{"session1": []}'], 'cstimer.txt', { type: 'text/plain' });
    const fileInput = container.querySelector('#file-input') as HTMLInputElement;

    const clickSpy = vi.spyOn(fileInput, 'click');
    const browseBtn = container.querySelector('#browse-files');
    expect(browseBtn).toBeInTheDocument();
    if (browseBtn) fireEvent.click(browseBtn);
    expect(clickSpy).toHaveBeenCalled();

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledWith(file);
  });

  it('calls onLoadDemo when "Load Sample Data" is clicked', () => {
    const onLoadDemo = vi.fn();

    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={onLoadDemo}
      />,
    );

    const loadDemoBtn = container.querySelector('#load-sample-data');
    expect(loadDemoBtn).toBeInTheDocument();
    if (loadDemoBtn) fireEvent.click(loadDemoBtn);
    expect(onLoadDemo).toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        errorMsg="Invalid csTimer file format"
      />,
    );

    const alert = container.querySelector('#file-uploader [role="alert"]');
    expect(alert).toBeInTheDocument();
    expect(alert?.textContent).toContain('Invalid csTimer file format');
  });

  it('renders speedcubing loading animation when isLoading is true', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        loadingProgress={65}
        loadingStage="Parsing solves and timestamps..."
        uploadingFileName="cstimer_my_solves.txt"
      />,
    );

    const progressbar = container.querySelector('#file-uploader [role="progressbar"]');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '65');
  });

  it('unmounts loading animation and displays upload prompt when isLoading switches to false', async () => {
    const { container, rerender } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        loadingProgress={100}
        uploadingFileName="browser_storage"
      />,
    );

    const dropzone = () => container.querySelector('#file-dropzone');

    // While loading: progress bar is shown and sample-data prompt is not
    expect(container.querySelector('#file-uploader [role="progressbar"]')).toBeInTheDocument();
    expect(container.querySelector('#load-sample-data')).toBeNull();
    expect(dropzone()).toHaveClass('min-h-[250px]');

    rerender(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={false}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('#file-uploader [role="progressbar"]')).toBeNull();
    });
    expect(container.querySelector('#load-sample-data')).toBeInTheDocument();
  });

  it('renders storage status bar when isSaved is true and handles reset dataset', () => {
    const onClearStorage = vi.fn();

    const { container, rerender } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isSaved={true}
        storageUsageMB={0.42}
        onClearStorage={onClearStorage}
      />,
    );

    // The storage bar is anchored by its Clear Saved Storage action
    const clearBtn = container.querySelector('#clear-saved-storage');
    expect(clearBtn).toBeInTheDocument();
    const storageBar = clearBtn?.parentElement ?? null;
    expect(storageBar?.textContent).toMatch(/\d+\.\d{2}\s*MB/);
    expect(container.querySelector('#storage-filename')).toBeNull();

    if (clearBtn) fireEvent.click(clearBtn);
    expect(onClearStorage).toHaveBeenCalled();

    // Rerender without storageUsageMB
    rerender(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isSaved={true}
        storageUsageMB={undefined}
        onClearStorage={onClearStorage}
      />,
    );
    expect(container.querySelector('#clear-saved-storage')?.parentElement?.textContent).not.toMatch(
      /\d+\.\d{2}\s*MB/,
    );
  });

  it('renders filename indicator in persistent storage area when fileName and isSaved are provided', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isSaved={true}
        fileName="cstimer_custom_export.txt"
      />,
    );

    const filenameBadge = container.querySelector('#storage-filename');
    expect(filenameBadge).toBeInTheDocument();
    expect(filenameBadge?.textContent).toContain('cstimer_custom_export.txt');
  });

  it('renders grouping period selector with responsive 2-column mobile and 4-column desktop grid', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
      />,
    );

    const dailyBtn = container.querySelector('#grouping-daily');
    const gridContainer = dailyBtn?.parentElement;
    expect(gridContainer).toHaveClass('grid-cols-2');
    expect(gridContainer).toHaveClass('sm:grid-cols-4');
  });

  it('renders saved notice banner when savedNotice is provided without error', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        savedNotice="Restored 350 solves across 1 sessions from IndexedDB"
      />,
    );

    expect(container.querySelector('#file-uploader [role="status"]')).toBeInTheDocument();
  });

  it('applies animate-fade-in-scale class to upload prompt and loading container', () => {
    const { container, rerender } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={false}
      />,
    );

    const dropzone = () => container.querySelector('#file-dropzone');
    const promptContainer = dropzone()?.firstElementChild;
    expect(promptContainer).toBeInTheDocument();
    expect(promptContainer).toHaveClass('animate-fade-in-scale');

    rerender(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        loadingProgress={30}
      />,
    );

    const progressbar = container.querySelector('#file-uploader [role="progressbar"]');
    const loadingContainer = progressbar?.closest('.animate-fade-in-scale');
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveClass('animate-fade-in-scale');
  });

  it('renders standard progress bar with accurate width style and clamp limits', () => {
    const { container, rerender } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        loadingProgress={0} // should clamp to min 5%
      />,
    );

    let progressbar = container.querySelector('#file-uploader [role="progressbar"]');
    expect(progressbar).toHaveStyle({ width: '5%' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar).toHaveClass('transition-[width]', 'duration-300', 'ease-out');

    rerender(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        loadingProgress={72}
      />,
    );

    progressbar = container.querySelector('#file-uploader [role="progressbar"]');
    expect(progressbar).toHaveStyle({ width: '72%' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '72');
  });

  it('renders LoadingElapsedTimer during loading and updates timer correctly', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <FileUploader
          sessions={mockSessions}
          selectedSessionId="s1"
          onSelectSession={vi.fn()}
          groupingPeriod="daily"
          onChangeGrouping={vi.fn()}
          customBatchSize={50}
          onChangeCustomBatchSize={vi.fn()}
          onFileUpload={vi.fn()}
          onLoadDemo={vi.fn()}
          isLoading={true}
          loadingProgress={50}
          loadingStage="Calculating averages..."
        />,
      );

      const timer = () => container.querySelector('#loading-elapsed-timer');

      expect(timer()?.textContent).toContain('0.00s');

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(timer()?.textContent).toContain('0.25s');

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(timer()?.textContent).toContain('0.50s');

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(timer()?.textContent).toContain('1.00s');
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders "How to export from csTimer?" button when onOpenInstructions is provided and calls callback', () => {
    const onOpenInstructions = vi.fn();
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        onOpenInstructions={onOpenInstructions}
      />,
    );

    const helpBtn = container.querySelector('#export-guide');
    expect(helpBtn).toBeInTheDocument();
    if (helpBtn) fireEvent.click(helpBtn);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it('does not render "How to export from csTimer?" button when onOpenInstructions is omitted', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
      />,
    );

    expect(container.querySelector('#export-guide')).not.toBeInTheDocument();
  });

  it('does not render "How to export from csTimer?" button while loading is in progress', () => {
    const { container } = render(
      <FileUploader
        sessions={mockSessions}
        selectedSessionId="s1"
        onSelectSession={vi.fn()}
        groupingPeriod="daily"
        onChangeGrouping={vi.fn()}
        customBatchSize={50}
        onChangeCustomBatchSize={vi.fn()}
        onFileUpload={vi.fn()}
        onLoadDemo={vi.fn()}
        isLoading={true}
        onOpenInstructions={vi.fn()}
      />,
    );

    expect(container.querySelector('#export-guide')).not.toBeInTheDocument();
  });
});
