import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar component', () => {
  it('renders application title and active file badge', () => {
    render(
      <Navbar
        fileName="my_solves.json"
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={vi.fn()}
      />
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
      />
    );

    const demoBtn = screen.getByText('Load Sample Data');
    fireEvent.click(demoBtn);
    expect(onLoadDemo).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when Reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <Navbar
        fileName="test.txt"
        onLoadDemo={vi.fn()}
        onReset={onReset}
        onExportCSV={vi.fn()}
      />
    );

    const resetBtn = screen.getByTitle('Reset Data');
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onExportCSV when Export CSV button is clicked', () => {
    const onExportCSV = vi.fn();
    render(
      <Navbar
        fileName="test.txt"
        onLoadDemo={vi.fn()}
        onReset={vi.fn()}
        onExportCSV={onExportCSV}
      />
    );

    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect(onExportCSV).toHaveBeenCalledTimes(1);
  });
});
