import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileUploader } from './FileUploader';
import { Session } from '../types';

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
      />
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
      />
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
      />
    );

    const weeklyBtn = screen.getByText('Weekly');
    fireEvent.click(weeklyBtn);
    expect(onChangeGrouping).toHaveBeenCalledWith('weekly');

    // Preset button for batch size
    const preset25Btn = screen.getByText('25');
    fireEvent.click(preset25Btn);
    expect(onChangeCustomBatchSize).toHaveBeenCalledWith(25);
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
      />
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
      />
    );

    expect(screen.getByText('Parsing solves and timestamps...')).toBeInTheDocument();
    expect(screen.getByText('cstimer_my_solves.txt')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });
});
