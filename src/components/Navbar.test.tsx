import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar component', () => {
  it('renders application title and active file badge', () => {
    render(
      <Navbar
        fileName="my_solves.json"
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />,
    );

    expect(screen.getByText('CubeProgression')).toBeInTheDocument();
    expect(screen.getByText('my_solves.json')).toBeInTheDocument();
  });

  it('calls onLoadDemo when Load Sample Data button is clicked', () => {
    const onLoadDemo = vi.fn();
    render(
      <Navbar
        fileName="test.txt"
        onLoadDemo={onLoadDemo}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />,
    );

    const demoBtn = screen.getByText('Load Sample Data');
    fireEvent.click(demoBtn);
    expect(onLoadDemo).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when Reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <Navbar fileName="test.txt" onLoadDemo={vi.fn()} onReset={onReset} onExportCSV={vi.fn()} />,
    );

    const resetBtn = screen.getByTitle('Reset Data');
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('renders dual responsive labels for Demo button with proper breakpoint classes', () => {
    render(
      <Navbar fileName="test.txt" onLoadDemo={vi.fn()} onReset={vi.fn()} onExportCSV={vi.fn()} />,
    );

    const fullLabel = screen.getByText('Load Sample Data');
    const mobileLabel = screen.getByText('Demo');
    expect(fullLabel).toHaveClass('hidden', 'sm:inline');
    expect(mobileLabel).toHaveClass('sm:hidden');
  });

  it('renders Export CSV label with mobile-hidden class and provides accessible aria-label', () => {
    render(
      <Navbar fileName="test.txt" onLoadDemo={vi.fn()} onReset={vi.fn()} onExportCSV={vi.fn()} />,
    );

    const exportText = screen.getByText('Export CSV');
    expect(exportText).toHaveClass('hidden', 'sm:inline');

    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    expect(exportButton).toBeInTheDocument();
  });

  it('renders filename pill with md:flex and truncate class for tablet portrait visibility', () => {
    render(
      <Navbar
        fileName="cstimer_long_session_export_name_2026.txt"
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />,
    );

    const pillText = screen.getByText('cstimer_long_session_export_name_2026.txt');
    expect(pillText).toHaveClass('truncate');
    expect(pillText.parentElement).toHaveClass('hidden', 'md:flex');
  });

  it('renders saved storage badge with lg:flex breakpoint class for desktop/tablet landscape only', () => {
    render(
      <Navbar
        fileName="test.txt"
        isSaved={true}
        storageUsageMB={1.42}
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />,
    );

    const badge = screen.getByText('Saved locally');
    expect(badge.closest('div')).toHaveClass('hidden', 'lg:flex');
    expect(screen.getByText('(1.42 MB)')).toBeInTheDocument();
  });

  it('renders Trash icon button with accessible aria-label when data is saved and onClearStorage is provided', () => {
    const onClearStorage = vi.fn();
    render(
      <Navbar
        fileName="test.txt"
        isSaved={true}
        onClearStorage={onClearStorage}
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />,
    );

    const trashBtn = screen.getByRole('button', { name: 'Reset Data' });
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn);
    expect(onClearStorage).toHaveBeenCalledTimes(1);
  });
});
