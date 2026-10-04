import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar component', () => {
  it('renders application heading and brand identity', () => {
    const { container } = render(<Navbar onReset={vi.fn()} />);

    const navbar = container.querySelector('#navbar');
    expect(navbar).toBeInTheDocument();
    expect(navbar?.querySelector('h1 span')).toBeInTheDocument();
    const logo = navbar?.querySelector('img');
    expect(logo).toBeInTheDocument();
    expect(logo?.getAttribute('src')).toContain('favicon.svg');
  });

  it('renders active filename pill when fileName is provided', () => {
    const { container } = render(<Navbar fileName="my_solves.json" onReset={vi.fn()} />);

    const filename = container.querySelector('#navbar-filename');
    expect(filename).toBeInTheDocument();
    expect(filename?.textContent).toContain('my_solves.json');
  });

  it('does not render filename pill when fileName is omitted', () => {
    const { container } = render(<Navbar onReset={vi.fn()} />);

    expect(container.querySelector('#navbar-filename')).toBeNull();
  });

  it('calls onReset when Reset button is clicked in unpersisted state', () => {
    const onReset = vi.fn();
    const { container } = render(<Navbar isSaved={false} fileName="test.txt" onReset={onReset} />);

    const resetBtn = container.querySelector('#navbar-reset');
    expect(resetBtn).toBeInTheDocument();
    if (resetBtn) fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onClearStorage when Reset button is clicked and data is persisted', () => {
    const onClearStorage = vi.fn();
    const { container } = render(
      <Navbar
        isSaved={true}
        onClearStorage={onClearStorage}
        fileName="test.txt"
        onReset={vi.fn()}
      />,
    );

    const trashBtn = container.querySelector('#navbar-reset');
    expect(trashBtn).toBeInTheDocument();
    if (trashBtn) fireEvent.click(trashBtn);
    expect(onClearStorage).toHaveBeenCalledTimes(1);
  });

  it('renders saved storage badge with usage size when isSaved is true and storageUsageMB > 0', () => {
    const { container } = render(
      <Navbar fileName="test.txt" isSaved={true} storageUsageMB={1.42} onReset={vi.fn()} />,
    );

    const badge = container.querySelector('#navbar-saved-badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toMatch(/\d+\.\d{2}\s*MB/);
  });

  it('omits storage usage size when storageUsageMB is 0 or undefined', () => {
    const { container } = render(
      <Navbar fileName="test.txt" isSaved={true} storageUsageMB={0} onReset={vi.fn()} />,
    );

    const badge = container.querySelector('#navbar-saved-badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).not.toMatch(/\d+\.\d{2}\s*MB/);
  });

  it('does not render saved badge when isSaved is false', () => {
    const { container } = render(<Navbar fileName="test.txt" isSaved={false} onReset={vi.fn()} />);

    expect(container.querySelector('#navbar-saved-badge')).toBeNull();
  });

  it('renders csTimer Guide button when onOpenInstructions is provided and triggers callback', () => {
    const onOpenInstructions = vi.fn();
    const { container } = render(
      <Navbar fileName="test.txt" onReset={vi.fn()} onOpenInstructions={onOpenInstructions} />,
    );

    const guideBtn = container.querySelector('#navbar-guide');
    expect(guideBtn).toBeInTheDocument();
    if (guideBtn) fireEvent.click(guideBtn);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it('does not render csTimer Guide button when onOpenInstructions is omitted', () => {
    const { container } = render(<Navbar fileName="test.txt" onReset={vi.fn()} />);

    expect(container.querySelector('#navbar-guide')).toBeNull();
  });

  it('renders Install App button when canInstall is true and calls onInstall', () => {
    const onInstall = vi.fn();
    const { container } = render(
      <Navbar fileName="test.txt" canInstall={true} onInstall={onInstall} onReset={vi.fn()} />,
    );

    const installBtn = container.querySelector('#navbar-install');
    expect(installBtn).toBeInTheDocument();
    if (installBtn) fireEvent.click(installBtn);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('does not render Install App button when canInstall is false', () => {
    const { container } = render(
      <Navbar fileName="test.txt" canInstall={false} onReset={vi.fn()} />,
    );

    expect(container.querySelector('#navbar-install')).toBeNull();
  });

  it('renders Offline mode pill with status role when isOnline is false', () => {
    const { container } = render(<Navbar fileName="test.txt" isOnline={false} onReset={vi.fn()} />);

    const offlineBadge = container.querySelector('#navbar-offline-status');
    expect(offlineBadge).toBeInTheDocument();
    expect(offlineBadge).toHaveAttribute('role', 'status');
  });

  it('does not render Offline mode pill when isOnline is true', () => {
    const { container } = render(<Navbar fileName="test.txt" isOnline={true} onReset={vi.fn()} />);

    expect(container.querySelector('#navbar-offline-status')).toBeNull();
  });
});
