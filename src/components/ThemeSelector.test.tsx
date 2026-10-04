import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme';
import { ThemeSelector } from './ThemeSelector';

function getControl(container: HTMLElement, selector: string): HTMLElement {
  const el = container.querySelector(selector);
  if (!el) {
    throw new Error(`Expected control "${selector}" to be rendered`);
  }
  return el as HTMLElement;
}

describe('ThemeSelector component', () => {
  beforeEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.removeAttribute('data-theme-mode');
    root.removeAttribute('style');
  });

  it('renders a collapsed selector trigger with listbox affordances', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const triggerBtn = getControl(container, '#theme-selector-btn');
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
    expect(triggerBtn.getAttribute('aria-haspopup')).toBe('listbox');
    expect(container.querySelector('#theme-dropdown-menu')).toBeNull();
  });

  it('opens the dropdown menu and lists every theme option', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const triggerBtn = getControl(container, '#theme-selector-btn');
    fireEvent.click(triggerBtn);

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');

    const menu = getControl(container, '#theme-dropdown-menu');
    expect(menu.getAttribute('role')).toBe('listbox');

    const options = container.querySelectorAll('[id^="theme-option-"]');
    expect(options.length).toBe(15);
  });

  it('marks the active theme option as selected by default', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    fireEvent.click(getControl(container, '#theme-selector-btn'));

    expect(getControl(container, '#theme-option-dark').getAttribute('aria-selected')).toBe('true');
    expect(getControl(container, '#theme-option-light').getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('closes the dropdown when the trigger is clicked again', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const triggerBtn = getControl(container, '#theme-selector-btn');
    fireEvent.click(triggerBtn);
    expect(container.querySelector('#theme-dropdown-menu')).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(container.querySelector('#theme-dropdown-menu')).toBeNull();
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('switches to a light theme, persists the choice, and updates the selected option', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const triggerBtn = getControl(container, '#theme-selector-btn');
    fireEvent.click(triggerBtn);
    fireEvent.click(getControl(container, '#theme-option-light'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');
    expect(localStorage.getItem('cubeprogression_theme')).toBe('light');

    // Dropdown should close after selection
    expect(container.querySelector('#theme-dropdown-menu')).toBeNull();
    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');

    // Reopening reflects the new selection
    fireEvent.click(triggerBtn);
    expect(getControl(container, '#theme-option-light').getAttribute('aria-selected')).toBe('true');
    expect(getControl(container, '#theme-option-dark').getAttribute('aria-selected')).toBe('false');
  });

  it('switches across multiple themes such as wca and cyberpunk', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const triggerBtn = getControl(container, '#theme-selector-btn');
    fireEvent.click(triggerBtn);
    fireEvent.click(getControl(container, '#theme-option-wca'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('wca');
    expect(localStorage.getItem('cubeprogression_theme')).toBe('wca');

    // Reopen and select cyberpunk
    fireEvent.click(triggerBtn);
    fireEvent.click(getControl(container, '#theme-option-cyberpunk'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
    expect(localStorage.getItem('cubeprogression_theme')).toBe('cyberpunk');
  });

  it('closes dropdown when Escape key is pressed', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    fireEvent.click(getControl(container, '#theme-selector-btn'));
    expect(container.querySelector('#theme-dropdown-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('#theme-dropdown-menu')).toBeNull();
  });

  it('closes dropdown when clicking outside', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    fireEvent.click(getControl(container, '#theme-selector-btn'));
    expect(container.querySelector('#theme-dropdown-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(container.querySelector('#theme-dropdown-menu')).toBeNull();
  });
});
