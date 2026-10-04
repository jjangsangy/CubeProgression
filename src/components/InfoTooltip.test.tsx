import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InfoTooltip } from './InfoTooltip';

const getById = (container: HTMLElement, id: string): HTMLElement => {
  const el = container.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`Expected element #${id} to be present`);
  return el;
};

const getTooltip = (): HTMLElement | null => document.getElementById('metric-help-tooltip');

const renderTooltip = () => {
  const { container } = render(<InfoTooltip id="metric-help" label="Metric help" text="Explain" />);
  const trigger = getById(container, 'metric-help');
  return { trigger };
};

describe('InfoTooltip', () => {
  it('starts closed with no tooltip mounted', () => {
    const { trigger } = renderTooltip();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(getTooltip()).toBeNull();
  });

  it('opens on mouse hover and closes on mouse leave', () => {
    const { trigger } = renderTooltip();

    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    expect(getTooltip()).not.toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
    expect(getTooltip()).toBeNull();
  });

  it('toggles open and closed on touch tap', () => {
    const { trigger } = renderTooltip();

    // Touch hardware emits pointerenter with pointerType 'touch' around the tap; it must be
    // ignored so it cannot flicker the tooltip shut when the tap toggles.
    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.pointerEnter(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger);
    expect(getTooltip()).toBeNull();
  });

  it('does not toggle closed when a mouse user clicks the already-hovered icon', () => {
    const { trigger } = renderTooltip();

    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    fireEvent.pointerDown(trigger, { pointerType: 'mouse' });
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();
  });

  it('dismisses on an outside pointer down', () => {
    const { trigger } = renderTooltip();

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();

    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(getTooltip()).toBeNull();
  });

  it('dismisses on Escape', () => {
    const { trigger } = renderTooltip();

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(getTooltip()).toBeNull();
  });

  it('opens on keyboard focus and closes on blur', () => {
    const { trigger } = renderTooltip();

    fireEvent.focus(trigger);
    expect(getTooltip()).not.toBeNull();

    fireEvent.blur(trigger);
    expect(getTooltip()).toBeNull();
  });

  it('opens on keyboard focus after a prior touch tap', () => {
    const { trigger } = renderTooltip();

    // Browsers fire focus around the tap; the tap then toggles the bubble open.
    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();

    // A later keyboard focus must still open it, so the touch modality cannot be sticky.
    fireEvent.blur(trigger);
    fireEvent.focus(trigger);
    expect(getTooltip()).not.toBeNull();
  });

  it('keeps the tooltip open when a focused icon is activated by keyboard', () => {
    const { trigger } = renderTooltip();

    fireEvent.focus(trigger);
    expect(getTooltip()).not.toBeNull();

    // Enter/Space dispatch a click; it must not toggle the just-opened bubble shut.
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    expect(getTooltip()).not.toBeNull();
  });

  it('describes the trigger with the tooltip while open', () => {
    const { trigger } = renderTooltip();
    expect(trigger).not.toHaveAttribute('aria-describedby');

    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    expect(trigger).toHaveAttribute('aria-describedby', 'metric-help-tooltip');
    expect(getTooltip()).toHaveAttribute('role', 'tooltip');
  });

  it('clamps the tooltip to the viewport margin when the trigger sits near the right edge', () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true });
    try {
      const { trigger } = renderTooltip();
      // Trigger reports a rect hard against the right edge; the bubble must be pulled back so
      // its right edge stops at the 8px viewport margin (the default zero-rect would not clamp).
      trigger.getBoundingClientRect = () =>
        ({
          left: 300,
          top: 40,
          right: 320,
          bottom: 60,
          width: 20,
          height: 20,
          x: 300,
          y: 40,
        }) as DOMRect;

      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
      const tooltip = getTooltip();
      expect(tooltip).not.toBeNull();
      if (!tooltip) return;

      // width = min(192, 320 - 16) = 192; max left = 320 - 192 - 8 = 120.
      expect(tooltip.style.left).toBe('120px');
      expect(Number(tooltip.style.left.replace('px', '')) + 192).toBeLessThanOrEqual(320 - 8);
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    }
  });

  it('flips above the trigger when there is not enough room below', () => {
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true });
    try {
      const { trigger } = renderTooltip();
      trigger.getBoundingClientRect = () =>
        ({
          left: 40,
          top: 160,
          right: 60,
          bottom: 180,
          width: 20,
          height: 20,
          x: 40,
          y: 160,
        }) as DOMRect;

      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
      const tooltip = getTooltip();
      expect(tooltip).not.toBeNull();
      expect(tooltip?.style.transform).toContain('translateY(-100%)');
    } finally {
      Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    }
  });

  it('keeps a tall explanation inside the viewport vertically', () => {
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
    try {
      const { trigger } = renderTooltip();
      trigger.getBoundingClientRect = () =>
        ({
          left: 40,
          top: 80,
          right: 60,
          bottom: 100,
          width: 20,
          height: 20,
          x: 40,
          y: 80,
        }) as DOMRect;

      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
      const tooltip = getTooltip();
      expect(tooltip).not.toBeNull();
      if (!tooltip) return;

      // jsdom performs no layout, so pretend the long explanation is 200px tall,
      // then force a reflow so the clamp uses the measured height.
      const bubbleHeight = 200;
      Object.defineProperty(tooltip, 'offsetHeight', { value: bubbleHeight, configurable: true });
      fireEvent(window, new Event('resize'));

      const top = Number(tooltip.style.top.replace('px', ''));
      // The bubble's bottom edge must stay inside the viewport margin.
      expect(top + bubbleHeight).toBeLessThanOrEqual(300 - 8);
    } finally {
      Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
    }
  });
});
