import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Solve } from '../types';
import { SolvesTable } from './SolvesTable';

const mockSolves: Solve[] = Array.from({ length: 20 }, (_, idx) => ({
  id: idx + 1,
  index: idx + 1,
  timeMs: 12000,
  rawTimeSec: 12.0,
  finalTimeSec: idx === 19 ? 14.0 : 12.0,
  penalty: idx === 18 ? 'DNF' : idx === 19 ? '+2' : 'OK',
  scramble: `R2 U2 F2 #${idx + 1}`,
  timestamp: 1600000000000 + idx * 1000,
  date: new Date(1600000000000 + idx * 1000),
  dateStr: '2020-09-13',
  ao5: idx >= 4 ? 12.0 : null,
  ao12: idx >= 11 ? 12.0 : null,
  ao50: idx >= 15 ? 12.5 : null,
  ao100: idx >= 18 ? 13.0 : null,
}));

describe('SolvesTable component', () => {
  it('renders solve table with pagination and solves count', () => {
    render(<SolvesTable solves={mockSolves} />);

    expect(screen.getByText(/Session Solve Log \(20 Total\)/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 15 of 20 solves')).toBeInTheDocument();
  });

  it('filters solves when search term is typed and shows empty message when no matches', () => {
    render(<SolvesTable solves={mockSolves} />);

    const searchInput = screen.getByPlaceholderText('Search solves or scrambles...');
    fireEvent.change(searchInput, { target: { value: '#19' } });

    expect(screen.getByText('Showing 1 to 1 of 1 solves')).toBeInTheDocument();

    // Search with non-matching query
    fireEvent.change(searchInput, { target: { value: 'nonexistent-scramble' } });
    expect(screen.getByText('No solves found matching your query.')).toBeInTheDocument();
    expect(screen.getByText('Showing 0 to 0 of 0 solves')).toBeInTheDocument();
  });

  it('navigates next and previous pagination pages and renders penalties', () => {
    render(<SolvesTable solves={mockSolves} />);

    const buttons = screen.getAllByRole('button');
    const prevBtn = buttons[buttons.length - 2]; // Left chevron button
    const nextBtn = buttons[buttons.length - 1]; // Right chevron button

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Go to page 2
    fireEvent.click(nextBtn);
    expect(screen.getByText('Showing 16 to 20 of 20 solves')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    // Page 2 contains DNF (#19) and +2 (#20)
    expect(screen.getByText('DNF')).toBeInTheDocument();
    expect(screen.getByText('(+2)')).toBeInTheDocument();

    // Go back to page 1
    fireEvent.click(prevBtn);
    expect(screen.getByText('Showing 1 to 15 of 20 solves')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
