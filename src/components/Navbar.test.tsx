import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar component', () => {
  it('renders application heading and brand identity', () => {
    const { container } = render(<Navbar />);

    const navbar = container.querySelector('#navbar');
    expect(navbar).toBeInTheDocument();
    expect(navbar?.querySelector('h1 span')).toBeInTheDocument();
    const logo = navbar?.querySelector('img');
    expect(logo).toBeInTheDocument();
    expect(logo?.getAttribute('src')).toContain('favicon.svg');
    expect(container.querySelector('#navbar-reset')).toBeNull();
    expect(container.querySelector('#navbar-saved-badge')).toBeNull();
  });

  it('renders active filename pill when fileName is provided', () => {
    const { container } = render(<Navbar fileName="my_solves.json" />);

    const filename = container.querySelector('#navbar-filename');
    expect(filename).toBeInTheDocument();
    expect(filename?.textContent).toContain('my_solves.json');
  });

  it('does not render filename pill when fileName is omitted', () => {
    const { container } = render(<Navbar />);

    expect(container.querySelector('#navbar-filename')).toBeNull();
  });

  it('renders csTimer Guide button when onOpenInstructions is provided and triggers callback', () => {
    const onOpenInstructions = vi.fn();
    const { container } = render(
      <Navbar fileName="test.txt" onOpenInstructions={onOpenInstructions} />,
    );

    const guideBtn = container.querySelector('#navbar-guide');
    expect(guideBtn).toBeInTheDocument();
    if (guideBtn) fireEvent.click(guideBtn);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it('does not render csTimer Guide button when onOpenInstructions is omitted', () => {
    const { container } = render(<Navbar fileName="test.txt" />);

    expect(container.querySelector('#navbar-guide')).toBeNull();
  });

  it('renders Install App button when canInstall is true and calls onInstall', () => {
    const onInstall = vi.fn();
    const { container } = render(
      <Navbar fileName="test.txt" canInstall={true} onInstall={onInstall} />,
    );

    const installBtn = container.querySelector('#navbar-install');
    expect(installBtn).toBeInTheDocument();
    if (installBtn) fireEvent.click(installBtn);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('does not render Install App button when canInstall is false', () => {
    const { container } = render(<Navbar fileName="test.txt" canInstall={false} />);

    expect(container.querySelector('#navbar-install')).toBeNull();
  });

  it('renders Offline mode pill with status role when isOnline is false', () => {
    const { container } = render(<Navbar fileName="test.txt" isOnline={false} />);

    const offlineBadge = container.querySelector('#navbar-offline-status');
    expect(offlineBadge).toBeInTheDocument();
    expect(offlineBadge).toHaveAttribute('role', 'status');
  });

  it('does not render Offline mode pill when isOnline is true', () => {
    const { container } = render(<Navbar fileName="test.txt" isOnline={true} />);

    expect(container.querySelector('#navbar-offline-status')).toBeNull();
  });
});
