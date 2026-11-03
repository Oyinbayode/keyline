const candidateSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isDisabled(element: Element): boolean {
  return element.matches(':disabled');
}

/**
 * Hidden, inert, or `display: none` elements cannot receive focus, so they
 * must not count as the first or last stop of a trap. `checkVisibility`
 * covers rendered layouts; the ancestor walk covers environments without it
 * (jsdom) and closed <details>, which hides content without CSS.
 */
function isHidden(element: Element): boolean {
  if (element.closest('[inert], [hidden]')) return true;

  const closedDetails = element.closest('details:not([open])');
  if (closedDetails && !element.matches('details > summary:first-of-type')) return true;

  if (typeof element.checkVisibility === 'function' && element.getClientRects().length > 0) {
    return !element.checkVisibility({ visibilityProperty: true });
  }

  if (getComputedStyle(element).visibility === 'hidden') return true;
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return true;
  }
  return false;
}

function isTabbable(element: HTMLElement): boolean {
  return element.tabIndex >= 0 && !isDisabled(element) && !isHidden(element);
}

/**
 * Elements inside `container` that Tab would visit, in the order the browser
 * visits them: positive tabindex values first (ascending), then DOM order.
 */
export function getTabbableElements(container: Element): HTMLElement[] {
  const tabbables = Array.from(container.querySelectorAll<HTMLElement>(candidateSelector)).filter(
    isTabbable,
  );
  const prioritised = tabbables
    .filter((element) => element.tabIndex > 0)
    .sort((first, second) => first.tabIndex - second.tabIndex);
  const natural = tabbables.filter((element) => element.tabIndex === 0);
  return [...prioritised, ...natural];
}
