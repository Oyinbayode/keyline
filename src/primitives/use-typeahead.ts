import { useRef } from 'react';

/** The parts of a keyboard event the typeahead reads; React's and the DOM's both fit. */
export interface TypeaheadKeyEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
}

export interface UseTypeaheadOptions {
  /** Milliseconds without a key press before the typed text starts over. Default `500`. */
  timeout?: number;
}

/**
 * Type-to-select for lists of items, as the WAI-ARIA APG describes for
 * menus, listboxes and trees. Returns a function to call from a keydown
 * handler with the items' text and the current index; it returns the index
 * to move to, or -1.
 *
 * Printable keys build up a search string that starts over after `timeout`.
 * The search starts after the current item, so pressing one letter again
 * cycles through the items that start with it ("b", "b", "b" visits each
 * B item; "ba" stays on "Banana" if it is already there). Keys with Ctrl,
 * Meta or Alt are left alone, as is Space unless a search is in progress
 * ("New window" is typed with a space, but on its own Space activates).
 * Every key it uses is `preventDefault()`ed, so the caller can check
 * `event.defaultPrevented` before treating Space as activation.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/#keyboardinteraction
 */
export function useTypeahead({ timeout = 500 }: UseTypeaheadOptions = {}) {
  const search = useRef('');
  // Not cleared on unmount: all it does is empty a ref nothing reads any more.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (event: TypeaheadKeyEvent, labels: readonly string[], currentIndex: number): number => {
    const { key } = event;
    if (key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return -1;
    if (key === ' ' && !search.current) return -1;
    event.preventDefault();

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      search.current = '';
    }, timeout);
    const typed = (search.current += key.toLowerCase());

    // "bbb" means "the next B", not a label that starts with three Bs.
    const needle = /^(.)\1+$/su.test(typed) ? key.toLowerCase() : typed;
    // A one-letter search moves on from the current item; a longer one may stay on it.
    const start = needle.length === 1 ? currentIndex + 1 : Math.max(currentIndex, 0);
    for (let offset = 0; offset < labels.length; offset++) {
      const index = (start + offset) % labels.length;
      if (labels[index]?.trim().toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  };
}
