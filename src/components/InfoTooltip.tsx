import { HelpCircle } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../theme';

interface InfoTooltipProps {
  /** Explanation revealed by the tooltip. */
  text: string;
  /** Accessible name for the help control (screen readers only). */
  label: string;
  /** Plain id for the help control; the tooltip renders as `${id}-tooltip`. */
  id?: string;
}

type TriggerModality = 'mouse' | 'touch' | 'pen' | 'keyboard';

const TOOLTIP_WIDTH = 192;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;
/** Fallback height used before the bubble mounts (jsdom always reports 0). */
const ESTIMATED_TOOLTIP_HEIGHT = 120;

interface TooltipPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

/** Clamps `value` into `[min, max]`, pinning to `min` for a taller-than-viewport range. */
function clampTop(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * A help icon that reveals its explanation on hover (pointer), on tap (touch/pen),
 * and via keyboard focus. Tap toggles, tapping outside or pressing Escape dismisses.
 *
 * The bubble is portalled to `document.body` and fixed-positioned against the
 * trigger's bounding box with viewport clamping, so it never escapes the screen
 * or gets clipped by an ancestor's `overflow-hidden` on narrow viewports.
 * Pointer modality is tracked so the touch sequence cannot flicker it shut.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, label, id }) => {
  const { colors } = useTheme();
  const generatedId = useId();
  const tooltipId = `${id ?? generatedId}-tooltip`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const measuredHeightRef = useRef(0);
  const modalityRef = useRef<TriggerModality>('mouse');
  // Marks the focus event a pointer press is expected to trigger, so the tap that follows can
  // toggle without the focus opening (and then the click closing) the bubble.
  const pointerFocusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    );

    // Prefer the measured height once the bubble is mounted so long explanations
    // never spill past the viewport edge; fall back to an estimate before then.
    const measured = bubbleRef.current?.offsetHeight ?? 0;
    const height = measured > 0 ? measured : ESTIMATED_TOOLTIP_HEIGHT;

    const spaceBelow = window.innerHeight - rect.bottom - TRIGGER_GAP;
    const spaceAbove = rect.top - TRIGGER_GAP;
    let placement: TooltipPosition['placement'];
    if (spaceBelow >= height) placement = 'bottom';
    else if (spaceAbove >= height) placement = 'top';
    else placement = spaceBelow >= spaceAbove ? 'bottom' : 'top';

    const top =
      placement === 'bottom'
        ? // Bubble spans [top, top + height].
          clampTop(
            rect.bottom + TRIGGER_GAP,
            VIEWPORT_MARGIN,
            window.innerHeight - height - VIEWPORT_MARGIN,
          )
        : // Bubble spans [top - height, top] because of translateY(-100%).
          clampTop(
            rect.top - TRIGGER_GAP,
            VIEWPORT_MARGIN + height,
            window.innerHeight - VIEWPORT_MARGIN,
          );

    setPosition({ left, top, placement });
  }, []);

  useEffect(() => {
    if (!open) {
      measuredHeightRef.current = 0;
      setPosition(null);
      return;
    }

    updatePosition();

    const handlePointerDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleReflow = () => updatePosition();

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open, updatePosition]);

  // Once the bubble is mounted, correct the position with its real height (before paint).
  useLayoutEffect(() => {
    if (!open) return;
    const height = bubbleRef.current?.offsetHeight ?? 0;
    if (height > 0 && height !== measuredHeightRef.current) {
      measuredHeightRef.current = height;
      updatePosition();
    }
  });

  return (
    <>
      <span className="relative inline-flex items-center">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-describedby={open ? tooltipId : undefined}
          className="inline-flex cursor-help items-center rounded-sm border-0 bg-transparent p-0 text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
          onPointerDown={(e) => {
            modalityRef.current = (e.pointerType as TriggerModality) || 'mouse';
            pointerFocusRef.current = true;
          }}
          onKeyDown={() => {
            modalityRef.current = 'keyboard';
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') {
              modalityRef.current = 'mouse';
              setOpen(true);
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse' && modalityRef.current === 'mouse') setOpen(false);
          }}
          onFocus={() => {
            // Ignore the focus a pointer press produces; keyboard focus still opens the bubble.
            if (!pointerFocusRef.current) setOpen(true);
            pointerFocusRef.current = false;
          }}
          onBlur={() => setOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            // Only touch/pen toggle: hover and keyboard focus already opened the bubble.
            if (modalityRef.current !== 'touch' && modalityRef.current !== 'pen') return;
            setOpen((prev) => !prev);
          }}
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </button>
      </span>
      {open &&
        position &&
        createPortal(
          <span
            ref={bubbleRef}
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[120] rounded-lg border p-2.5 text-left text-[11px] font-normal leading-relaxed shadow-2xl backdrop-blur-md"
            style={{
              left: position.left,
              top: position.top,
              width: TOOLTIP_WIDTH,
              maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
              transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
              backgroundColor: colors.bgCard,
              borderColor: colors.borderSubtle,
              color: colors.textPrimary,
            }}
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
};
