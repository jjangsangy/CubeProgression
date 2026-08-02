import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App component', () => {
  it('renders app title, Navbar, and loads sample data on mount', async () => {
    render(<App />);

    expect(screen.getByText('CubeProgression')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/)
      ).toBeInTheDocument();
    });
  });

  it('allows changing session and grouping period', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/)
      ).toBeInTheDocument();
    });

    const weeklyBtn = screen.getByText('Weekly');
    fireEvent.click(weeklyBtn);

    expect(weeklyBtn.closest('button')).toHaveClass('bg-amber-500/15');
  });

  it('allows resetting dataset and re-loading demo data', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/)
      ).toBeInTheDocument();
    });

    const resetBtn = screen.getByTitle('Reset Data');
    fireEvent.click(resetBtn);

    expect(
      screen.queryByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/)
    ).not.toBeInTheDocument();

    const loadDemoBtns = screen.getAllByText(/Load Sample Data/);
    fireEvent.click(loadDemoBtns[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/F2L Yellow Cross Progression \(Demo\): Progression Over 350 Solves/)
      ).toBeInTheDocument();
    });
  });
});
