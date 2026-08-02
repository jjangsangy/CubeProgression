import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PbProgressionChart } from './PbProgressionChart';
import { Solve } from '../types';

const mockSolves: Solve[] = [
  {
    id: 1,
    index: 1,
    timeMs: 15000,
    rawTimeSec: 15.0,
    finalTimeSec: 15.0,
    penalty: 'OK',
    timestamp: 1600000000000,
    date: new Date(1600000000000),
    dateStr: '2020-09-13',
  },
  {
    id: 2,
    index: 2,
    timeMs: 12000,
    rawTimeSec: 12.0,
    finalTimeSec: 12.0,
    penalty: 'OK',
    timestamp: 1600000100000,
    date: new Date(1600000100000),
    dateStr: '2020-09-13',
  },
  {
    id: 3,
    index: 3,
    timeMs: 10000,
    rawTimeSec: 10.0,
    finalTimeSec: 10.0,
    penalty: 'OK',
    timestamp: 1600000200000,
    date: new Date(1600000200000),
    dateStr: '2020-09-13',
  },
  {
    id: 4,
    index: 4,
    timeMs: 11000,
    rawTimeSec: 11.0,
    finalTimeSec: 11.0,
    penalty: 'OK',
    timestamp: 1600000300000,
    date: new Date(1600000300000),
    dateStr: '2020-09-13',
  },
  {
    id: 5,
    index: 5,
    timeMs: 9000,
    rawTimeSec: 9.0,
    finalTimeSec: 9.0,
    penalty: 'OK',
    timestamp: 1600000400000,
    date: new Date(1600000400000),
    dateStr: '2020-09-13',
  },
];

describe('PbProgressionChart component', () => {
  it('renders PB progression title and stat badges', () => {
    render(<PbProgressionChart solves={mockSolves} title="Personal Best Progression" />);

    expect(screen.getByText('Personal Best Progression')).toBeInTheDocument();
    expect(screen.getByText('PB Records')).toBeInTheDocument();
    // Best single is 9.00s
    expect(screen.getByText('9.00s')).toBeInTheDocument();
  });

  it('allows toggling line visibility buttons', () => {
    render(<PbProgressionChart solves={mockSolves} />);

    const singleBtn = screen.getByRole('button', { name: /^Single$/i });
    expect(singleBtn).toBeInTheDocument();
    fireEvent.click(singleBtn);
    expect(singleBtn).toBeInTheDocument();
  });

  it('allows expanding record milestone history drawer', () => {
    render(<PbProgressionChart solves={mockSolves} />);

    const historyBtn = screen.getByText(/Record Milestones History/i);
    fireEvent.click(historyBtn);

    expect(screen.getByText(/Filter Record Type:/i)).toBeInTheDocument();
    expect(screen.getAllByText('PB Single').length).toBeGreaterThan(0);
  });
});
