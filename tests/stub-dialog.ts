import { afterAll, beforeAll } from 'vitest';

/*
 * jsdom implements <dialog> without showModal() or close(). This stub mirrors
 * only what those methods do to the element's state (the `open` attribute and
 * the queued `close` event) so ARIA wiring and React/DOM state sync can be
 * unit-tested. It does NOT emulate the top layer, background inertness, focus
 * movement, Esc, or ::backdrop, and no unit test asserts any of those: they
 * are covered by tests/e2e/dialog.spec.ts in real Chromium and Firefox.
 */
export function stubDialogOpenState() {
  const prototype = HTMLDialogElement.prototype;
  const original = {
    showModal: Object.getOwnPropertyDescriptor(prototype, 'showModal'),
    close: Object.getOwnPropertyDescriptor(prototype, 'close'),
  };

  beforeAll(() => {
    prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    prototype.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      setTimeout(() => this.dispatchEvent(new Event('close')));
    };
  });

  afterAll(() => {
    for (const [name, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor);
      else Reflect.deleteProperty(prototype, name);
    }
  });
}
