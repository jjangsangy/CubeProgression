import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as dbStorage from './utils/dbStorage';

describe('App component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders app title, Navbar, and loads sample data on mount', async () => {
    render(<App />);

    expect(screen.getByText('CubeProgression')).toBeInTheDocument();
    expect(
      screen.getByText('Checking IndexedDB storage for saved csTimer data...'),
    ).toBeInTheDocument();
    expect(screen.getByText('browser_storage')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Complete!')).not.toBeInTheDocument();
    });
  });

  it('restores saved dataset from IndexedDB on initial mount when available', async () => {
    vi.spyOn(dbStorage, 'getSavedDataset').mockResolvedValueOnce({
      id: 'active_dataset',
      fileName: 'restored_cstimer.txt',
      selectedSessionId: 'session1',
      groupingPeriod: 'weekly',
      customBatchSize: 30,
      updatedAt: Date.now(),
      sessions: [
        {
          id: 'session1',
          name: 'Restored Session',
          solves: [
            {
              id: 1,
              index: 1,
              timeMs: 11500,
              rawTimeSec: 11.5,
              finalTimeSec: 11.5,
              penalty: 'OK',
              timestamp: 1600000000000,
              date: new Date(1600000000000),
              dateStr: '2020-09-13',
            },
            {
              id: 2,
              index: 2,
              timeMs: 12500,
              rawTimeSec: 12.5,
              finalTimeSec: 12.5,
              penalty: 'OK',
              timestamp: 1600000060000,
              date: new Date(1600000060000),
              dateStr: '2020-09-13',
            },
          ],
        },
      ],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText(/Restored Session/).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loaded saved data successfully!')).not.toBeInTheDocument();
    });
  });

  it('allows changing session and grouping period', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    const weeklyBtn = screen.getByText('Weekly');
    fireEvent.click(weeklyBtn);

    expect(weeklyBtn.closest('button')).toHaveClass('bg-amber-500/15');

    // Switch to By Solve Count (customBatch)
    const batchBtn = screen.getByText('By Solve Count');
    fireEvent.click(batchBtn);

    // Change batch size input
    const batchInput = screen.getByRole('spinbutton');
    fireEvent.change(batchInput, { target: { value: '75' } });
    expect(batchInput).toHaveValue(75);
  });

  it('allows resetting dataset and re-loading demo data', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    const resetBtn = screen.getByTitle('Reset Data');
    fireEvent.click(resetBtn);

    expect(
      screen.queryByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
    ).not.toBeInTheDocument();

    const loadDemoBtns = screen.getAllByText(/Load Sample Data/);
    fireEvent.click(loadDemoBtns[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });
  });

  it('exports period summary statistics as a CSV download', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const captured: { anchor: HTMLAnchorElement | null } = { anchor: null };
    const originalAppend = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        captured.anchor = node;
      }
      return originalAppend(node);
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Export Period Summary Stats as CSV'));

    expect(clickSpy).toHaveBeenCalled();
    const anchor = captured.anchor;
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('download')).toContain('F2L Yellow Cross Progression (Demo)');
    expect(anchor?.getAttribute('download')).toMatch(/_period_stats\.csv$/);

    const csv = decodeURI(anchor?.getAttribute('href') ?? '');
    expect(csv).toContain('Period,Solves,Mean(s),Median(s),Min(s),Max(s),Q1(s),Q3(s),StdDev(s)');
    expect(csv).toContain('"Day 1 (');
  });

  it('handles file upload error handling for invalid files', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);

    const fileInput = screen.getByLabelText('Upload csTimer file');
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    // Upload an invalid JSON file
    const invalidFile = new File(['invalid content without json'], 'bad_file.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid csTimer file format/i)).toBeInTheDocument();
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('handles valid csTimer file upload', async () => {
    render(<App />);

    const fileInput = screen.getByLabelText('Upload csTimer file');
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    // Upload a valid csTimer JSON file
    const validData = JSON.stringify({
      properties: {
        sessionData: JSON.stringify({ '1': { name: 'Uploaded 3x3 Session' } }),
      },
      session1: [
        [[0, 11000], 'R U R', '', 1600000000],
        [[0, 10500], 'U R U', '', 1600000060],
      ],
    });
    const validFile = new File([validData], 'valid_cstimer.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getAllByText(/Uploaded 3x3 Session/).length).toBeGreaterThan(0);
    });
  });

  it('handles clearing storage via FileUploader and selecting sessions', async () => {
    render(<App />);

    const fileInput = screen.getByLabelText('Upload csTimer file');
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    // Change session selector if available
    const sessionSelector = screen.getByRole('combobox');
    fireEvent.change(sessionSelector, { target: { value: 'session_demo_1' } });

    // Clear saved storage
    const clearStorageBtn = screen.getByTitle('Clear saved data from browser storage');
    fireEvent.click(clearStorageBtn);

    await waitFor(() => {
      expect(screen.queryByText(/F2L Yellow Cross Progression/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('File upload dropzone')).toBeInTheDocument();
    });
  });

  it('handles FileReader error during file upload', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function (
      this: FileReader,
    ) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });

    render(<App />);

    const fileInput = screen.getByLabelText('Upload csTimer file');
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    const file = new File(['content'], 'read_err.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Error reading uploaded file.')).toBeInTheDocument();
    });
    consoleErrorSpy.mockRestore();
  });

  it('falls back to demo data when IndexedDB getSavedDataset fails on initial mount', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'getSavedDataset').mockRejectedValueOnce(
      new Error('IndexedDB blocked by browser security'),
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('displays error message when an empty (0-byte) file is uploaded and recovers when loading sample data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);

    const fileInput = screen.getByLabelText('Upload csTimer file');
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(screen.getByText('File is empty.')).toBeInTheDocument();
    });

    // Recover by clicking Load Sample Data
    const loadSampleBtns = screen.getAllByRole('button', { name: /Load Sample Data/i });
    fireEvent.click(loadSampleBtns[0]);

    await waitFor(() => {
      expect(screen.queryByText('File is empty.')).toBeNull();
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });
  });

  it('safely handles user interactions and CSV export when dataset is cleared/empty', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/),
      ).toBeInTheDocument();
    });

    // Reset Data
    const resetBtn = screen.getByTitle('Reset Data');
    fireEvent.click(resetBtn);

    // Grouping change and CSV export should not throw or download
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const weeklyBtn = screen.getByText('Weekly');
    fireEvent.click(weeklyBtn);

    const exportBtn = screen.getByTitle('Export Period Summary Stats as CSV');
    fireEvent.click(exportBtn);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
