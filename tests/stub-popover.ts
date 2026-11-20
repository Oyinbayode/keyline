import { afterAll, beforeAll } from 'vitest';

/*
 * jsdom has the `popover` attribute but not showPopover() or hidePopover(),
 * and hides every popover, open or not. This stub
 * mirrors only the visibility state: a closed popover is display:none, so
 * Testing Library and the virtual screen reader leave it out of the
 * accessibility tree, and a `toggle` event is queued on every change, as the
 * browser does. It does NOT emulate the top layer, light dismiss, Esc, focus
 * restoration, or anchor positioning: those are asserted in Playwright.
 */
const openAttribute = 'data-stub-popover-open';

export function stubPopover() {
  const prototype = HTMLElement.prototype;
  const original = {
    showPopover: Object.getOwnPropertyDescriptor(prototype, 'showPopover'),
    hidePopover: Object.getOwnPropertyDescriptor(prototype, 'hidePopover'),
  };
  const style = document.createElement('style');
  // jsdom hides every popover (`:popover-open` never matches there) with a rule it ranks above ours.
  style.textContent = `[popover][${openAttribute}] { display: block !important; }`;

  function toggle(element: HTMLElement, open: boolean) {
    if (element.hasAttribute(openAttribute) === open) return;
    element.toggleAttribute(openAttribute, open);
    setTimeout(() => {
      element.dispatchEvent(
        Object.assign(new Event('toggle'), {
          oldState: open ? 'closed' : 'open',
          newState: open ? 'open' : 'closed',
        }),
      );
    });
  }

  beforeAll(() => {
    document.head.append(style);
    prototype.showPopover = function showPopover(this: HTMLElement) {
      toggle(this, true);
    };
    prototype.hidePopover = function hidePopover(this: HTMLElement) {
      toggle(this, false);
    };
  });

  afterAll(() => {
    style.remove();
    for (const [name, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor);
      else Reflect.deleteProperty(prototype, name);
    }
  });
}

/** What the browser does on a light dismiss or Esc: hide the popover without asking React. */
export function lightDismiss(element: HTMLElement) {
  element.hidePopover();
}

export function isPopoverOpen(element: HTMLElement): boolean {
  return element.hasAttribute(openAttribute);
}
