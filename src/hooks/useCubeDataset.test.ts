import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as csTimerParser from '../utils/csTimerParser';
import * as csvExport from '../utils/csvExport';
import * as dbStorage from '../utils/dbStorage';
import { useCubeDataset } from './useCubeDataset';

describe('useCubeDataset', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hydrates with demo dataset on mount when storage is empty', async () => {
    const { result } = renderHook(() => useCubeDataset());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadingStage).toBe(
      'Checking IndexedDB storage for saved csTimer data...',
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions.length).toBeGreaterThan(0);
    expect(result.current.activeSession).not.toBeNull();
    expect(result.current.globalStats).not.toBeNull();
    expect(result.current.fileName).toBe('cstimer_demo_350solves.txt');
    expect(result.current.isSaved).toBe(true);
  });

  it('restores existing dataset from IndexedDB on mount and records storage usage', async () => {
    vi.spyOn(dbStorage, 'getStorageInfo').mockResolvedValueOnce({
      usageMB: 0.42,
      quotaMB: 500,
    });
    vi.spyOn(dbStorage, 'getSavedDataset').mockResolvedValueOnce({
      id: 'active_dataset',
      fileName: 'custom_export.txt',
      selectedSessionId: 'sess_1',
      groupingPeriod: 'weekly',
      customBatchSize: 25,
      updatedAt: Date.now(),
      sessions: [
        {
          id: 'sess_1',
          name: 'Session 1',
          solves: [
            {
              id: 1,
              index: 1,
              timeMs: 10000,
              rawTimeSec: 10.0,
              finalTimeSec: 10.0,
              penalty: 'OK',
              timestamp: 1600000000000,
              date: new Date(1600000000000),
              dateStr: '2020-09-13',
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fileName).toBe('custom_export.txt');
    expect(result.current.groupingPeriod).toBe('weekly');
    expect(result.current.customBatchSize).toBe(25);
    expect(result.current.selectedSessionId).toBe('sess_1');
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.storageUsageMB).toBe(0.42);
    expect(result.current.savedNotice).toContain('Restored 1 solves');
  });

  it('falls back to demo data when IndexedDB lookup rejects during mount', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'getSavedDataset').mockRejectedValueOnce(
      new Error('IndexedDB blocked by security policy'),
    );

    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load dataset from IndexedDB:',
      expect.any(Error),
    );
  });

  it('sets errorMsg when demo dataset saving fails on mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'getSavedDataset').mockResolvedValueOnce(null);
    vi.spyOn(dbStorage, 'saveDataset').mockRejectedValueOnce(
      new Error('Disk full or quota exceeded'),
    );

    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMsg).toBe('Failed to load sample dataset.');
  });

  it('sets errorMsg when loadSampleData encounters a storage failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.spyOn(dbStorage, 'saveDataset').mockRejectedValueOnce(new Error('Storage unavailable'));

    await act(async () => {
      await result.current.loadSampleData();
    });

    expect(result.current.errorMsg).toBe('Failed to load sample dataset.');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles clearing storage and re-loading sample data', async () => {
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleClearStorage();
    });

    expect(result.current.sessions).toHaveLength(0);
    expect(result.current.activeSession).toBeNull();
    expect(result.current.isSaved).toBe(false);
    expect(result.current.storageUsageMB).toBeUndefined();
    expect(result.current.savedNotice).toBeNull();

    await act(async () => {
      await result.current.loadSampleData();
    });

    expect(result.current.sessions.length).toBeGreaterThan(0);
    expect(result.current.activeSession).not.toBeNull();
  });

  it('handles clearSavedDataset rejection gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(dbStorage, 'clearSavedDataset').mockRejectedValueOnce(new Error('IndexedDB blocked'));

    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleClearStorage();
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear storage:', expect.any(Error));
    });
  });

  it('updates grouping period, custom batch size, and switches selected session', async () => {
    const saveSpy = vi.spyOn(dbStorage, 'saveDataset').mockResolvedValue(undefined);
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleChangeGrouping('monthly');
    });
    expect(result.current.groupingPeriod).toBe('monthly');
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ groupingPeriod: 'monthly' }));

    act(() => {
      result.current.handleChangeCustomBatchSize(75);
    });
    expect(result.current.customBatchSize).toBe(75);
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ customBatchSize: 75 }));

    act(() => {
      result.current.handleSelectSession('session_demo_1');
    });
    expect(result.current.selectedSessionId).toBe('session_demo_1');
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ selectedSessionId: 'session_demo_1' }),
    );
  });

  it('does not save dataset when changing session or grouping if sessions array is empty', async () => {
    const saveSpy = vi.spyOn(dbStorage, 'saveDataset').mockResolvedValue(undefined);
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleClearStorage();
    });
    saveSpy.mockClear();

    act(() => {
      result.current.handleSelectSession('some_id');
      result.current.handleChangeGrouping('weekly');
      result.current.handleChangeCustomBatchSize(100);
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('handles valid file upload and updates state with notice', async () => {
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validExport = JSON.stringify({
      properties: {
        sessionData: JSON.stringify({ '1': { name: 'Hook Uploaded Session' } }),
      },
      session1: [
        [[0, 12000], "R U R'", '', 1600000000],
        [[0, 11000], "U R U'", '', 1600000060],
      ],
    });
    const file = new File([validExport], 'my_cstimer.txt', { type: 'text/plain' });

    act(() => {
      result.current.handleFileUpload(file);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.uploadingFileName).toBe('my_cstimer.txt');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fileName).toBe('my_cstimer.txt');
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].name).toBe('Hook Uploaded Session');
    expect(result.current.savedNotice).toContain('Saved 2 solves across 1 sessions');
  });

  it('handles empty 0-byte file upload by setting errorMsg', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });

    act(() => {
      result.current.handleFileUpload(emptyFile);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMsg).toBe('File is empty.');
  });

  it('handles malformed file upload by capturing error message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const invalidFile = new File(['not valid json or cstimer format'], 'bad.txt', {
      type: 'text/plain',
    });

    act(() => {
      result.current.handleFileUpload(invalidFile);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMsg).toMatch(/Invalid csTimer file format/i);
  });

  it('handles non-Error throw during file parsing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.spyOn(csTimerParser, 'parseCsTimerFile').mockImplementationOnce(() => {
      throw 'string error';
    });

    const file = new File(['{"invalid": 1}'], 'throw_string.txt', { type: 'text/plain' });

    act(() => {
      result.current.handleFileUpload(file);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMsg).toBe('Error parsing csTimer file.');
  });

  it('handles FileReader error during file upload', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function (
      this: FileReader,
    ) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });

    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(['some text'], 'read_err.txt', { type: 'text/plain' });

    act(() => {
      result.current.handleFileUpload(file);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMsg).toBe('Error reading uploaded file.');
  });

  it('triggers CSV export via handleExportCSV', async () => {
    const exportSpy = vi.spyOn(csvExport, 'exportPeriodStatsCsv');
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleExportCSV();
    });

    expect(exportSpy).toHaveBeenCalledWith(
      result.current.periodGroups,
      result.current.activeSession?.name,
    );
  });

  it('catches and logs errors when background saveDataset rejects on user preference changes', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useCubeDataset());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.spyOn(dbStorage, 'saveDataset').mockRejectedValue(new Error('Background save failed'));

    act(() => {
      result.current.handleSelectSession('session_demo_1');
      result.current.handleChangeGrouping('weekly');
      result.current.handleChangeCustomBatchSize(30);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('when getStorageInfo rejects (storage estimation failure)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('hydrates demo data with undefined storageUsageMB when getStorageInfo rejects on mount', async () => {
      vi.spyOn(dbStorage, 'getStorageInfo').mockRejectedValue(new Error('QuotaExceeded'));
      const { result } = renderHook(() => useCubeDataset());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions.length).toBeGreaterThan(0);
      expect(result.current.storageUsageMB).toBeUndefined();
      expect(result.current.isSaved).toBe(true);
    });

    it('reloads sample dataset safely when getStorageInfo rejects', async () => {
      vi.spyOn(dbStorage, 'getStorageInfo').mockRejectedValue(new Error('QuotaExceeded'));
      const { result } = renderHook(() => useCubeDataset());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadSampleData();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessions.length).toBeGreaterThan(0);
      expect(result.current.fileName).toBe('cstimer_demo_350solves.txt');
      expect(result.current.storageUsageMB).toBeUndefined();
    });

    it('completes file upload and persists data when getStorageInfo rejects', async () => {
      vi.spyOn(dbStorage, 'getStorageInfo').mockRejectedValue(new Error('QuotaExceeded'));
      const { result } = renderHook(() => useCubeDataset());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const validExport = JSON.stringify({
        session1: [[[0, 10000], "R U R'", '', 1600000000]],
      });
      const file = new File([validExport], 'quota_fail.txt', { type: 'text/plain' });

      act(() => {
        result.current.handleFileUpload(file);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fileName).toBe('quota_fail.txt');
      expect(result.current.storageUsageMB).toBeUndefined();
      expect(result.current.isSaved).toBe(true);
    });
  });
});
