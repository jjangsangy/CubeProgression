import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SolvesTable } from './SolvesTable';
import { Solve } from '../types';

const mockSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 12000,
  rawTimeSec: 12.0,
  finalTimeSec: 12.0,
  penalty: idx === 18 ? 'DNF' : idx === 19 ? '+2' : 'OK',
  scramble: `R2 U2 F2 #${idx + 1}`,
  timestamp: 1600000000000 + idx * 1000,
  date: new Date(1600000000000 + idx * 1000),
  dateStr: '2020-09-13',
  ao12: 12.0,
  ao50: null,
}));

describe('SolvesTable component', () => {
  it('renders solve table with pagination and solves count', () => {
    render(<SolvesTable solves={mockSolves} />);

    expect(screen.getByText(/Session Solve Log \(20 Total\)/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 15 of 20 solves')).toBeInTheDocument();
  });

  it('filters solves when search term is typed', () => {
    render(<SolvesTable solves={mockSolves} />);

    const searchInput = screen.getByPlaceholderText('Search solves or scrambles...');
    fireEvent.change(searchInput, { target: { value: '#19' } });

    expect(screen.getByText('Showing 1 to 1 of 1 solves')).toBeInTheDocument();
  });

  it('navigates pagination pages', () => {
    render(<SolvesTable solves={mockSolves} />);

    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons[buttons.length - 1]; // Right chevron button

    fireEvent.click(nextBtn);
    expect(screen.getByText('Showing 16 to 20 of 20 solves')).toBeInTheDocument();
  });
});
