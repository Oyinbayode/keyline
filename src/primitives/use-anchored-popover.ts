import type { RefObject, ToggleEvent } from 'react';
import { useId as useReactId, useLayoutEffect, useReducer, useRef } from 'react';

export type PopoverMode = 'auto' | 'manual';
/** Which side of the anchor the surface opens on. Flips when there is no room. */
export type PopoverSide = 'top' | 'bottom';
/** Which inline edge of the anchor the surface lines up with: logical, so it mirrors in RTL. */
export type PopoverAlign = 'start' | 'end';

export interface UseAnchoredPopoverOptions {
  /** Whether the surface is showing. */
  open: boolean;
  /** Called with `false` when the browser hides the surface on its own (light dismiss, Esc). */
  onOpenChange: (open: boolean) => void;
  /** The element the surface is placed against. */
  anchorRef: RefObject<HTMLElement | null>;
  /**
   * `'auto'`: the browser closes it on Esc and on a click outside, and only
   * one auto popover is open at a time. `'manual'`: only `open` closes it.
   * Default `'auto'`.
   */
  mode?: PopoverMode;
  /** Default `'bottom'`. */
  side?: PopoverSide;
  /** Default `'start'`. */
  align?: PopoverAlign;
  /** Make the surface at least as wide as the anchor. Default `false`. */
  matchAnchorWidth?: boolean;
}

export interface AnchoredPopoverProps<T extends HTMLElement> {
  ref: RefObject<T | null>;
  popover: PopoverMode;
  /** Hears the browser hiding the surface; call it from your own `onToggle` if you have one. */
  onToggle: (event: ToggleEvent<T>) => void;
}

/*
 * Of two positions along one axis, the preferred one if it fits in
 * [0, limit], else the other if that fits, else the preferred one anyway:
 * what `position-try-fallbacks` does with a flip.
 */
function pick(preferred: number, other: number, size: number, limit: number): number {
  const fits = (at: number) => at >= 0 && at + size <= limit;
  return fits(preferred) || !fits(other) ? preferred : other;
}

/*
 * The measured fallback for browsers without CSS anchor positioning: the
 * same placement as the CSS path, worked out from the anchor's box.
 */
function place(
  popover: HTMLElement,
  anchor: HTMLElement,
  side: PopoverSide,
  align: PopoverAlign,
  matchAnchorWidth: boolean,
) {
  const box = anchor.getBoundingClientRect();
  const { style } = popover;
  style.inset = 'auto';
  if (matchAnchorWidth) style.minWidth = `${String(box.width)}px`;

  const computed = getComputedStyle(popover);
  const px = (length: string) => parseFloat(length) || 0;
  const width = popover.offsetWidth;
  const height = popover.offsetHeight + px(computed.marginTop) + px(computed.marginBottom);
  const below = box.bottom;
  const above = box.top - height;
  const rtl = computed.direction === 'rtl';
  const start = rtl ? box.right - width : box.left;
  const end = rtl ? box.left : box.right - width;

  const top =
    side === 'bottom'
      ? pick(below, above, height, window.innerHeight)
      : pick(above, below, height, window.innerHeight);
  const viewportWidth = document.documentElement.clientWidth;
  const left =
    align === 'start'
      ? pick(start, end, width, viewportWidth)
      : pick(end, start, width, viewportWidth);
  style.top = `${String(top)}px`;
  style.left = `${String(left - px(computed.marginLeft))}px`;
}

/**
 * Shows a floating surface next to an anchor element, using the platform:
 * the surface is a native popover (`showPopover()`), so it renders in the
 * top layer with no z-index and no portal while staying where it is in the
 * DOM, which keeps it usable inside a modal `<dialog>`. CSS anchor
 * positioning places it, with logical insets so it mirrors in RTL and
 * `position-try-fallbacks` to flip when there is no room. Browsers without
 * anchor positioning get a measured placement that follows scroll and resize.
 *
 * Spread the result onto the surface element. React state stays the source
 * of truth: when the browser hides an auto popover itself, `onOpenChange`
 * hears `false`, and a parent that keeps `open` true gets it shown again.
 *
 * @see https://developer.mozilla.org/docs/Web/API/Popover_API
 * @see https://developer.mozilla.org/docs/Web/CSS/CSS_anchor_positioning
 */
export function useAnchoredPopover<T extends HTMLElement>({
  open,
  onOpenChange,
  anchorRef,
  mode = 'auto',
  side = 'bottom',
  align = 'start',
  matchAnchorWidth = false,
}: UseAnchoredPopoverOptions): AnchoredPopoverProps<T> {
  const ref = useRef<T>(null);
  // React ids contain characters a dashed ident cannot.
  const anchorName = `--kl-anchor-${useReactId().replace(/[^\w-]/g, '')}`;
  // Re-runs the effect below when the browser hid the surface and the parent kept it open.
  const [reassertions, reassert] = useReducer((count: number) => count + 1, 0);

  // A layout effect, so the surface is placed before the browser paints it.
  useLayoutEffect(() => {
    const popover = ref.current;
    const anchor = anchorRef.current;
    if (!popover || !anchor) return;
    // Both are no-ops when the popover is already in that state.
    if (!open) {
      popover.hidePopover();
      return;
    }

    // Read in the effect, where `CSS` always exists, and per open, so tests can switch paths.
    const anchored = CSS.supports('anchor-name: --kl');
    if (anchored) {
      anchor.style.setProperty('anchor-name', anchorName);
      const { style } = popover;
      const [from, to] = side === 'bottom' ? ['start', 'end'] : ['end', 'start'];
      style.setProperty('position-anchor', anchorName);
      style.inset = 'auto';
      // Block insets resolve against the viewport; `self-` inline edges follow the surface's own direction.
      style.setProperty(`inset-block-${from}`, `anchor(${to})`);
      style.setProperty(`inset-inline-${align}`, `anchor(self-${align})`);
      style.setProperty(
        'position-try-fallbacks',
        'flip-block, flip-inline, flip-block flip-inline',
      );
      if (matchAnchorWidth) style.setProperty('min-inline-size', 'anchor-size(width)');
    }
    popover.showPopover({ source: anchor });
    if (anchored) return;

    const reposition = () => {
      place(popover, anchor, side, align, matchAnchorWidth);
    };
    reposition();
    // Capture, so scrolling any container that holds the anchor moves the surface with it.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reassertions, anchorRef, anchorName, side, align, matchAnchorWidth]);

  return {
    ref,
    popover: mode,
    // `toggle` is queued, so by the time it arrives a close that React asked for has already set `open` false.
    onToggle: (event) => {
      if (!open || event.newState !== 'closed') return;
      onOpenChange(false);
      reassert();
    },
  };
}
