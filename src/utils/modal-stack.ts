/*
 * Every Keyline modal dialog that is currently open, oldest first. Two things
 * need it: the page scroll lock, which must hold until the last dialog closes,
 * and the toast viewport, which must live inside the topmost dialog because
 * a modal dialog makes everything outside it inert.
 */
const openDialogs: HTMLDialogElement[] = [];
const listeners = new Set<() => void>();

let unlockScroll: (() => void) | undefined;

/*
 * `overflow: hidden` on the root removes its scrollbar, which shifts the page
 * by the scrollbar's width. Reserving the gutter keeps the layout still, and
 * only when there was a classic scrollbar to begin with: an overlay scrollbar
 * or a page too short to scroll has nothing to reserve.
 */
function lockScroll() {
  const root = document.documentElement;
  const { overflow, scrollbarGutter } = root.style;
  if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = 'stable';
  root.style.overflow = 'hidden';
  return () => {
    root.style.overflow = overflow;
    root.style.scrollbarGutter = scrollbarGutter;
  };
}

function notify() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function pushModal(dialog: HTMLDialogElement) {
  if (openDialogs.includes(dialog)) return;
  openDialogs.push(dialog);
  unlockScroll ??= lockScroll();
  notify();
}

export function removeModal(dialog: HTMLDialogElement) {
  const index = openDialogs.indexOf(dialog);
  if (index === -1) return;
  openDialogs.splice(index, 1);
  if (openDialogs.length === 0) {
    unlockScroll?.();
    unlockScroll = undefined;
  }
  notify();
}

export function getTopModal(): HTMLDialogElement | null {
  return openDialogs.at(-1) ?? null;
}

export function subscribeToModals(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
