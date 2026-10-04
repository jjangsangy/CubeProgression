import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as dbStorage from './utils/dbStorage';

const getFileInput = () => document.querySelector('#file-input') as HTMLInputElement;

describe('App component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Navbar and loads the sample dataset on mount', async () => {
    const { container } = render(<App />);

    expect(container.querySelector('#navbar h1')).toBeInTheDocument();
    expect(container.querySelector('#file-uploader')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    // The dashboard replaces the loading placeholder once the session resolves
    await waitFor(() => {
      expect(container.querySelector('#dashboard-loading-skeleton')).toBeNull();
    });
  });

  it('restores saved dataset from IndexedDB on initial mount when available', async () => {
    vi.spyOn(dbStorage, 'getSavedDataset').mockResolvedValueOnce({
      id: 'active_dataset',
      fileName: 'restored_cstimer.txt',
      selectedSessionId: 'session1',
      groupingPeriod: 'weekly',
      customBatchSize: 30,
      updatedAt: Temporal.Now.instant().epochMilliseconds,
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
              date: Temporal.PlainDate.from('2020-09-13'),
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
              date: Temporal.PlainDate.from('2020-09-13'),
              dateStr: '2020-09-13',
            },
          ],
        },
      ],
    });

    const { container } = render(<App />);

    await waitFor(() => {
      const select = container.querySelector('#session-selector') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('session1');
      expect(select.querySelectorAll('option')).toHaveLength(1);
    });

    expect(container.querySelector('#file-uploader [role="alert"]')).toBeNull();
  });

  it('allows changing session and grouping period', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    const weeklyBtn = container.querySelector('#grouping-weekly');
    expect(weeklyBtn).toBeInTheDocument();
    expect(weeklyBtn).toHaveAttribute('aria-pressed', 'false');
    if (weeklyBtn) fireEvent.click(weeklyBtn);
    expect(weeklyBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to By Solve Count (customBatch)
    const batchBtn = container.querySelector('#grouping-customBatch');
    expect(batchBtn).toBeInTheDocument();
    if (batchBtn) fireEvent.click(batchBtn);
    expect(batchBtn).toHaveAttribute('aria-pressed', 'true');

    // Change batch size input
    const batchInput = container.querySelector(
      '#file-uploader input[type="number"]',
    ) as HTMLInputElement;
    expect(batchInput).toBeInTheDocument();
    fireEvent.change(batchInput, { target: { value: '75' } });
    expect(batchInput).toHaveValue(75);
  });

  it('allows resetting dataset and re-loading demo data', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    const resetBtn = container.querySelector('#clear-saved-storage');
    expect(resetBtn).toBeInTheDocument();
    if (resetBtn) fireEvent.click(resetBtn);

    expect(container.querySelector('#progression-chart')).toBeNull();

    const loadDemoBtn = container.querySelector('#load-sample-data');
    expect(loadDemoBtn).toBeInTheDocument();
    if (loadDemoBtn) fireEvent.click(loadDemoBtn);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });
  });

  it('handles file upload error handling for invalid files', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<App />);

    const fileInput = getFileInput();
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    // Upload an invalid JSON file
    const invalidFile = new File(['invalid content without json'], 'bad_file.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(container.querySelector('#file-uploader [role="alert"]')).toBeInTheDocument();
    });
    const alert = container.querySelector('#file-uploader [role="alert"]');
    expect(alert?.textContent).toContain('Invalid csTimer file format');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('handles valid csTimer file upload', async () => {
    const { container } = render(<App />);

    const fileInput = getFileInput();
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
      const select = container.querySelector('#session-selector') as HTMLSelectElement;
      expect(select.querySelectorAll('option')).toHaveLength(1);
      expect(select.value).toBe('session1');
    });
  });

  it('handles clearing storage via FileUploader and selecting sessions', async () => {
    const { container } = render(<App />);

    const fileInput = getFileInput();
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    // Select a non-default session before clearing
    const sessionSelector = container.querySelector('#session-selector') as HTMLSelectElement;
    fireEvent.change(sessionSelector, { target: { value: 'session2' } });
    expect(sessionSelector.value).toBe('session2');

    // Clear saved storage
    const clearStorageBtn = container.querySelector('#clear-saved-storage');
    expect(clearStorageBtn).toBeInTheDocument();
    if (clearStorageBtn) fireEvent.click(clearStorageBtn);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeNull();
      expect(container.querySelector('#file-dropzone')).toBeInTheDocument();
    });
  });

  it('handles FileReader error during file upload', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function (
      this: FileReader,
    ) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });

    const { container } = render(<App />);

    const fileInput = getFileInput();
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    const file = new File(['content'], 'read_err.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(container.querySelector('#file-uploader [role="alert"]')).toBeInTheDocument();
    });
    const alert = container.querySelector('#file-uploader [role="alert"]');
    expect(alert?.textContent).toContain('Error reading uploaded file.');
    consoleErrorSpy.mockRestore();
  });

  it('falls back to demo data when IndexedDB getSavedDataset fails on initial mount', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'getSavedDataset').mockRejectedValueOnce(new Error('IndexedDB corrupted'));

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('displays error message when an empty (0-byte) file is uploaded and recovers when loading sample data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<App />);

    const fileInput = getFileInput();
    await waitFor(() => {
      expect(fileInput).not.toBeDisabled();
    });

    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(container.querySelector('#file-uploader [role="alert"]')).toBeInTheDocument();
    });
    const alert = container.querySelector('#file-uploader [role="alert"]');
    expect(alert?.textContent).toContain('File is empty.');

    // Recover by clicking Load Sample Data
    const loadSampleBtn = container.querySelector('#load-sample-data');
    expect(loadSampleBtn).toBeInTheDocument();
    if (loadSampleBtn) fireEvent.click(loadSampleBtn);

    await waitFor(() => {
      expect(container.querySelector('#file-uploader [role="alert"]')).toBeNull();
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });
  });

  it('safely handles user interactions when dataset is cleared/empty', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    // Reset Data
    const resetBtn = container.querySelector('#clear-saved-storage');
    expect(resetBtn).toBeInTheDocument();
    if (resetBtn) fireEvent.click(resetBtn);

    // Grouping change should not throw
    const weeklyBtn = container.querySelector('#grouping-weekly');
    expect(weeklyBtn).toBeInTheDocument();
    if (weeklyBtn) fireEvent.click(weeklyBtn);
  });

  it('opens and closes the csTimer instruction modal from Navbar and FileUploader across loaded and empty states', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('#progression-chart')).toBeInTheDocument();
    });

    // Modal is initially closed
    expect(document.querySelector('#instruction-modal')).toBeNull();

    // 1. Open from Navbar "csTimer Guide" button and close via Escape key
    const exportGuideBtn = container.querySelector('#navbar-guide');
    expect(exportGuideBtn).toBeInTheDocument();
    if (exportGuideBtn) fireEvent.click(exportGuideBtn);

    expect(document.querySelector('#instruction-modal [role="dialog"]')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('#instruction-modal')).toBeNull();

    // 2. Open from FileUploader button and close via the confirm button
    const fileUploaderHelpBtn = container.querySelector('#export-guide');
    expect(fileUploaderHelpBtn).toBeInTheDocument();
    if (fileUploaderHelpBtn) fireEvent.click(fileUploaderHelpBtn);

    expect(document.querySelector('#instruction-modal [role="dialog"]')).toBeInTheDocument();

    const gotItBtn = document.querySelector('#instruction-modal-confirm');
    expect(gotItBtn).toBeInTheDocument();
    if (gotItBtn) fireEvent.click(gotItBtn);
    expect(document.querySelector('#instruction-modal')).toBeNull();

    // 3. Reset dataset to empty state and verify modal is still accessible from both Navbar and FileUploader
    const resetBtn = container.querySelector('#clear-saved-storage');
    expect(resetBtn).toBeInTheDocument();
    if (resetBtn) fireEvent.click(resetBtn);

    const emptyHelpBtn = container.querySelector('#export-guide');
    expect(emptyHelpBtn).toBeInTheDocument();
    if (emptyHelpBtn) fireEvent.click(emptyHelpBtn);
    expect(document.querySelector('#instruction-modal [role="dialog"]')).toBeInTheDocument();

    const closeBtn = document.querySelector('#instruction-modal-close');
    expect(closeBtn).toBeInTheDocument();
    if (closeBtn) fireEvent.click(closeBtn);
    expect(document.querySelector('#instruction-modal')).toBeNull();
  });
});
