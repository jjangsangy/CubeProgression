import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar component', () => {
  it('renders application heading and brand identity', () => {
    render(<Navbar onReset={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'CubeProgression' })).toBeInTheDocument();
    expect(screen.getByText('csTimer Analytics')).toBeInTheDocument();
    const logo = screen.getByRole('img', { name: 'CubeProgression Logo' });
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('src')).toContain('favicon.svg');
  });

  it('renders active filename pill when fileName is provided', () => {
    render(<Navbar fileName="my_solves.json" onReset={vi.fn()} />);

    expect(screen.getByText('my_solves.json')).toBeInTheDocument();
  });

  it('does not render filename pill when fileName is omitted', () => {
    render(<Navbar onReset={vi.fn()} />);

    expect(screen.queryByText('my_solves.json')).not.toBeInTheDocument();
  });

  it('calls onReset when Reset button is clicked in unpersisted state', () => {
    const onReset = vi.fn();
    render(<Navbar isSaved={false} fileName="test.txt" onReset={onReset} />);

    const resetBtn = screen.getByRole('button', { name: 'Reset Data' });
    expect(screen.getByText('Reset')).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onClearStorage when Reset button is clicked and data is persisted', () => {
    const onClearStorage = vi.fn();
    render(
      <Navbar
        isSaved={true}
        onClearStorage={onClearStorage}
        fileName="test.txt"
        onReset={vi.fn()}
      />,
    );

    const trashBtn = screen.getByRole('button', { name: 'Reset Data' });
    expect(screen.getByText('Reset')).toBeInTheDocument();
    fireEvent.click(trashBtn);
    expect(onClearStorage).toHaveBeenCalledTimes(1);
  });

  it('renders saved storage badge with usage size when isSaved is true and storageUsageMB > 0', () => {
    render(<Navbar fileName="test.txt" isSaved={true} storageUsageMB={1.42} onReset={vi.fn()} />);

    expect(screen.getByText('Saved locally')).toBeInTheDocument();
    expect(screen.getByText('(1.42 MB)')).toBeInTheDocument();
  });

  it('omits storage usage size when storageUsageMB is 0 or undefined', () => {
    render(<Navbar fileName="test.txt" isSaved={true} storageUsageMB={0} onReset={vi.fn()} />);

    expect(screen.getByText('Saved locally')).toBeInTheDocument();
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
  });

  it('does not render saved badge when isSaved is false', () => {
    render(<Navbar fileName="test.txt" isSaved={false} onReset={vi.fn()} />);

    expect(screen.queryByText('Saved locally')).not.toBeInTheDocument();
  });

  it('renders csTimer Guide button when onOpenInstructions is provided and triggers callback', () => {
    const onOpenInstructions = vi.fn();
    render(
      <Navbar fileName="test.txt" onReset={vi.fn()} onOpenInstructions={onOpenInstructions} />,
    );

    const guideBtn = screen.getByRole('button', { name: 'csTimer Guide' });
    expect(guideBtn).toHaveAttribute('title', 'How to export solves from csTimer');
    expect(screen.getByText('Guide')).toBeInTheDocument();
    fireEvent.click(guideBtn);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it('does not render csTimer Guide button when onOpenInstructions is omitted', () => {
    render(<Navbar fileName="test.txt" onReset={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'csTimer Guide' })).not.toBeInTheDocument();
  });

  it('renders Install App button when canInstall is true and calls onInstall', () => {
    const onInstall = vi.fn();
    render(
      <Navbar fileName="test.txt" canInstall={true} onInstall={onInstall} onReset={vi.fn()} />,
    );

    const installBtn = screen.getByRole('button', { name: 'Install App' });
    expect(installBtn).toHaveAttribute('title', 'Install CubeProgression as a Progressive Web App');
    fireEvent.click(installBtn);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('does not render Install App button when canInstall is false', () => {
    render(<Navbar fileName="test.txt" canInstall={false} onReset={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Install App' })).not.toBeInTheDocument();
  });

  it('renders Offline mode pill with status role when isOnline is false', () => {
    render(<Navbar fileName="test.txt" isOnline={false} onReset={vi.fn()} />);

    const offlineBadge = screen.getByRole('status', { name: 'Offline mode' });
    expect(offlineBadge).toBeInTheDocument();
    expect(
      screen.getByTitle('You are offline. All features, solves, and statistics operate locally.'),
    ).toBeInTheDocument();
  });

  it('does not render Offline mode pill when isOnline is true', () => {
    render(<Navbar fileName="test.txt" isOnline={true} onReset={vi.fn()} />);

    expect(screen.queryByRole('status', { name: 'Offline mode' })).not.toBeInTheDocument();
  });
});
