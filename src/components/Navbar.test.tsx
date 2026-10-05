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
    expect(container.querySelector('#navbar-filename')).toBeNull();
  });

  it('renders header with safe-area-top class for mobile notch inset protection', () => {
    const { container } = render(<Navbar />);

    const navbar = container.querySelector('#navbar');
    expect(navbar).toBeInTheDocument();
    expect(navbar).toHaveClass('safe-area-top');
  });

  it('renders csTimer Guide button when onOpenInstructions is provided and triggers callback', () => {
    const onOpenInstructions = vi.fn();
    const { container } = render(<Navbar onOpenInstructions={onOpenInstructions} />);

    const guideBtn = container.querySelector('#navbar-guide');
    expect(guideBtn).toBeInTheDocument();
    if (guideBtn) fireEvent.click(guideBtn);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it('does not render csTimer Guide button when onOpenInstructions is omitted', () => {
    const { container } = render(<Navbar />);

    expect(container.querySelector('#navbar-guide')).toBeNull();
  });

  it('renders Install App button by default when running in non-standalone browser mode', () => {
    const { container } = render(<Navbar />);

    const installBtn = container.querySelector('#navbar-install');
    expect(installBtn).toBeInTheDocument();
  });

  it('renders Install App button when canInstall is true and calls onInstall', () => {
    const onInstall = vi.fn();
    const { container } = render(<Navbar canInstall={true} onInstall={onInstall} />);

    const installBtn = container.querySelector('#navbar-install');
    expect(installBtn).toBeInTheDocument();
    if (installBtn) fireEvent.click(installBtn);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('does not render Install App button when canInstall is false', () => {
    const { container } = render(<Navbar canInstall={false} />);

    expect(container.querySelector('#navbar-install')).toBeNull();
  });

  it('does not render Install App button when running in Firefox', () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
      configurable: true,
    });

    try {
      const { container } = render(<Navbar />);
      expect(container.querySelector('#navbar-install')).toBeNull();
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });

  it('renders Open in App button when app is already installed and invokes openInApp on click without opening new tab', () => {
    localStorage.setItem('cubeprogression_pwa_installed', 'true');
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    let clickedHref = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedHref = this.href;
    });

    try {
      const { container } = render(<Navbar />);
      const appBtn = container.querySelector('#navbar-install');
      expect(appBtn).toBeInTheDocument();
      expect(appBtn).toHaveAttribute('aria-label', 'Open in App');

      if (appBtn) fireEvent.click(appBtn);
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(clickedHref).toContain('web+cubeprogression://open?url=');
    } finally {
      localStorage.clear();
    }
  });

  it('renders Offline mode pill with status role when isOnline is false', () => {
    const { container } = render(<Navbar isOnline={false} />);

    const offlineBadge = container.querySelector('#navbar-offline-status');
    expect(offlineBadge).toBeInTheDocument();
    expect(offlineBadge).toHaveAttribute('role', 'status');
  });

  it('does not render Offline mode pill when isOnline is true', () => {
    const { container } = render(<Navbar isOnline={true} />);

    expect(container.querySelector('#navbar-offline-status')).toBeNull();
  });
});
