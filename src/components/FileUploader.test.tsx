import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        date: new Date(1600000000000),
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
    render(
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

    expect(screen.getByText('Main Session (1 solves)')).toBeInTheDocument();
    expect(screen.getByText('OH Session (0 solves)')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('handles selecting session', () => {
    const onSelectSession = vi.fn();
    render(
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

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 's2' } });
    expect(onSelectSession).toHaveBeenCalledWith('s2');
  });

  it('handles changing grouping period and batch size', () => {
    const onChangeGrouping = vi.fn();
    const onChangeCustomBatchSize = vi.fn();

    render(
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

    const weeklyBtn = screen.getByText('Weekly');
    fireEvent.click(weeklyBtn);
    expect(onChangeGrouping).toHaveBeenCalledWith('weekly');

    // Preset button for batch size
    const preset25Btn = screen.getByText('25');
    fireEvent.click(preset25Btn);
    expect(onChangeCustomBatchSize).toHaveBeenCalledWith(25);
  });

  it('handles changing custom batch size input with valid and invalid values', () => {
    const onChangeCustomBatchSize = vi.fn();

    render(
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

    const input = screen.getByRole('spinbutton');
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

    render(
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

    const dropzone = screen.getByLabelText('File upload dropzone');

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

    render(
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
    const fileInput = screen.getByLabelText('Upload csTimer file');

    const clickSpy = vi.spyOn(fileInput, 'click');
    const browseBtn = screen.getByText('click to browse');
    fireEvent.click(browseBtn);
    expect(clickSpy).toHaveBeenCalled();

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onFileUpload).toHaveBeenCalledWith(file);
  });

  it('calls onLoadDemo when "Load Sample Data" is clicked', () => {
    const onLoadDemo = vi.fn();

    render(
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

    const loadDemoBtn = screen.getByText('Load Sample Data');
    fireEvent.click(loadDemoBtn);
    expect(onLoadDemo).toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    render(
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
        errorMsg="Invalid JSON format"
      />,
    );

    expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
  });

  it('renders speedcubing loading animation when isLoading is true', () => {
    render(
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

    expect(screen.getByText('Parsing solves and timestamps...')).toBeInTheDocument();
    expect(screen.getByText('cstimer_my_solves.txt')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('unmounts loading animation and displays upload prompt when isLoading switches to false', async () => {
    const { rerender } = render(
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
        loadingStage="Loaded saved data successfully!"
        uploadingFileName="browser_storage"
      />,
    );

    expect(screen.getByText('Loaded saved data successfully!')).toBeInTheDocument();
    expect(screen.getByText('browser_storage')).toBeInTheDocument();
    expect(screen.queryByText(/cstimer\.txt/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('File upload dropzone')).toHaveClass('min-h-[250px]');

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
      expect(screen.queryByText('Loaded saved data successfully!')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/cstimer\.txt/)).toBeInTheDocument();
  });

  it('renders storage status bar when isSaved is true and handles reset dataset', () => {
    const onClearStorage = vi.fn();

    const { rerender } = render(
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

    expect(screen.getByText('Persistent Storage Active (IndexedDB)')).toBeInTheDocument();
    expect(screen.getByText(/0.42\s*MB/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Clear Saved Storage/i });
    fireEvent.click(clearBtn);
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
    expect(screen.queryByText(/0.42\s*MB/i)).not.toBeInTheDocument();
  });

  it('renders grouping period selector with responsive 2-column mobile and 4-column desktop grid', () => {
    render(
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

    const dailyBtn = screen.getByText('Daily').closest('button');
    const gridContainer = dailyBtn?.parentElement;
    expect(gridContainer).toHaveClass('grid-cols-2');
    expect(gridContainer).toHaveClass('sm:grid-cols-4');
  });

  it('hides persistence explanation subtitle on small mobile viewports', () => {
    render(
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
      />,
    );

    const subtitle = screen.getByText('Your dataset stays saved across browser reloads');
    expect(subtitle).toHaveClass('hidden');
    expect(subtitle).toHaveClass('sm:inline');
  });

  it('renders saved notice banner when savedNotice is provided without error', () => {
    render(
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

    expect(
      screen.getByText('Restored 350 solves across 1 sessions from IndexedDB'),
    ).toBeInTheDocument();
  });

  it('applies animate-fade-in-scale class to upload prompt and loading container', () => {
    const { rerender } = render(
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

    const promptContainer = screen
      .getByRole('heading', { name: /Upload/i })
      .closest('.animate-fade-in-scale');
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

    const progressbar = screen.getByRole('progressbar');
    const loadingContainer = progressbar.closest('.animate-fade-in-scale');
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveClass('animate-fade-in-scale');
  });

  it('renders standard progress bar with accurate width style and clamp limits', () => {
    const { rerender } = render(
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

    let progressbar = screen.getByRole('progressbar');
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

    progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveStyle({ width: '72%' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '72');
  });

  it('renders LoadingElapsedTimer during loading and updates timer correctly', () => {
    vi.useFakeTimers();
    try {
      render(
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

      expect(screen.getByText('0.00s')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(screen.getByText('0.25s')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(750);
      });
      expect(screen.getByText('1.00s')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
