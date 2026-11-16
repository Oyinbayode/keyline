import type { KeyboardEvent } from 'react';

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface UseRovingFocusOptions {
  /** CSS selector for the items, matched inside the element the handler is attached to. */
  itemSelector: string;
  /** Which arrow keys move focus. Default `'horizontal'`. */
  orientation?: RovingOrientation;
  /** Wrap from the last item to the first and back. Default `true`. */
  loop?: boolean;
  /** Called with the item that just received focus from the keyboard. */
  onNavigate?: (item: HTMLElement) => void;
}

function isDisabled(item: HTMLElement): boolean {
  return item.matches(':disabled') || item.getAttribute('aria-disabled') === 'true';
}

/*
 * Where a key starts looking and which way it walks. Home walks forwards from
 * just before the first item and End backwards from just after the last, so
 * both land on the first enabled item they meet.
 */
function walkForKey(
  key: string,
  orientation: RovingOrientation,
  rtl: boolean,
  currentIndex: number,
  count: number,
): [start: number, step: number] | null {
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';
  if (key === 'Home') return [-1, 1];
  if (key === 'End') return [count, -1];
  if ((key === 'ArrowRight' && horizontal) || (key === 'ArrowDown' && vertical)) {
    return [currentIndex, key === 'ArrowRight' && rtl ? -1 : 1];
  }
  if ((key === 'ArrowLeft' && horizontal) || (key === 'ArrowUp' && vertical)) {
    return [currentIndex, key === 'ArrowLeft' && rtl ? 1 : -1];
  }
  return null;
}

/**
 * Arrow-key focus movement for composite widgets (tab lists, toolbars,
 * radio groups) as described in the WAI-ARIA APG "Managing focus within
 * components" guidance. Returns a keydown handler for the container.
 *
 * Horizontal arrows follow reading direction, so Right moves towards the
 * end of the line in RTL too. Disabled items are skipped. Which item holds
 * `tabIndex={0}` is left to the component, because the right answer differs
 * (the selected tab, the last focused toolbar button).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex
 */
export function useRovingFocus({
  itemSelector,
  orientation = 'horizontal',
  loop = true,
  onNavigate,
}: UseRovingFocusOptions): (event: KeyboardEvent<HTMLElement>) => void {
  // Not memoised: callers pass an inline onNavigate, so a memo would miss on every render anyway.
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const container = event.currentTarget;
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    // Keyboard events only fire on elements, never on text nodes.
    const current = (event.target as Element).closest<HTMLElement>(itemSelector);
    const currentIndex = current ? items.indexOf(current) : -1;
    if (currentIndex === -1) return;

    const walk = walkForKey(
      event.key,
      orientation,
      container.matches(':dir(rtl)'),
      currentIndex,
      items.length,
    );
    if (!walk) return;
    // Handled even when there is nowhere to go, so the page does not scroll instead.
    event.preventDefault();

    const [start, step] = walk;
    const wraps = loop && start === currentIndex;
    for (let offset = 1; offset <= items.length; offset++) {
      let index = start + step * offset;
      if (wraps) index = (index + items.length) % items.length;
      const target = items[index];
      if (!target || target === current) return;
      if (!isDisabled(target)) {
        target.focus();
        onNavigate?.(target);
        return;
      }
    }
  };
}
