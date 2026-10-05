import { fireEvent, render } from '@testing-library/react';
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
  dateStr: '2020-09-13',
  ao5: idx >= 4 ? 12.0 : null,
  ao12: idx >= 11 ? 12.0 : null,
  ao50: idx >= 15 ? 12.5 : null,
  ao100: idx >= 18 ? 13.0 : null,
}));

describe('SolvesTable component', () => {
  it('renders solve table with pagination and solves count', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const section = container.querySelector('#solves-table');
    expect(section).toBeInTheDocument();

    // 8 columns, 15 rows on page 1, pagination enabled forward only
    expect(section?.querySelectorAll('thead th')).toHaveLength(8);
    expect(section?.querySelectorAll('tbody tr')).toHaveLength(15);
    expect(section?.querySelector('#solves-prev-page')).toBeDisabled();
    expect(section?.querySelector('#solves-next-page')).toBeEnabled();
  });

  it('filters solves when search term is typed and shows empty message when no matches', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const section = container.querySelector('#solves-table');
    const searchInput = section?.querySelector('#solves-search') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: '#19' } });

    // Single match collapses to a single-page result set
    expect(section?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(section?.querySelector('#solves-next-page')).toBeDisabled();

    // Search with non-matching query renders the empty-state placeholder row
    fireEvent.change(searchInput, { target: { value: 'nonexistent-scramble' } });
    const emptyRow = section?.querySelector('tbody tr td');
    expect(emptyRow).toHaveAttribute('colspan', '8');
    expect(section?.querySelector('#solves-next-page')).toBeDisabled();
  });

  it('navigates next and previous pagination pages and renders penalties', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const section = container.querySelector('#solves-table');

    const prevBtn = section?.querySelector('#solves-prev-page');
    const nextBtn = section?.querySelector('#solves-next-page');

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Go to page 2: remaining 5 solves, forward navigation disabled
    if (nextBtn) fireEvent.click(nextBtn);
    expect(container.querySelector('#pagination-indicator')?.textContent).toBe('2 / 2');
    expect(section?.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).toBeEnabled();

    // Page 2 contains the DNF (#19) and +2 (#20) penalty rows
    const penaltyText = Array.from(section?.querySelectorAll('tbody tr') ?? [])
      .map((row) => row.textContent ?? '')
      .join(' ');
    expect(penaltyText).toMatch(/DNF/);
    expect(penaltyText).toMatch(/\(\+2\)/);

    // Go back to page 1: full 15-row page
    if (prevBtn) fireEvent.click(prevBtn);
    expect(container.querySelector('#pagination-indicator')?.textContent).toBe('1 / 2');
    expect(section?.querySelectorAll('tbody tr')).toHaveLength(15);
  });

  it('contains responsive classes for header and search input', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const header = container.querySelector('.border-b');
    expect(header).toHaveClass('flex-col');
    expect(header).toHaveClass('sm:flex-row');

    const searchInput = container.querySelector('#solves-search') as HTMLInputElement;
    expect(searchInput.parentElement).toHaveClass('w-full');
    expect(searchInput.parentElement).toHaveClass('sm:w-64');
  });

  it('renders table within an overflow-x-auto container for mobile horizontal scrolling', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.querySelector('table')).toBeInTheDocument();
  });

  it('wraps scramble strings in max-w-xs truncate containers', () => {
    const { container } = render(<SolvesTable solves={mockSolves} />);
    const scrambleWrapper = container.querySelector('td .max-w-xs.truncate');
    expect(scrambleWrapper).toBeInTheDocument();
    expect(scrambleWrapper?.textContent).toContain('R2 U2 F2 #1');
  });
});
