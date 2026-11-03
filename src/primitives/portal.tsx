import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** Where to render. Defaults to `document.body`. */
  container?: Element | DocumentFragment | null;
}

const subscribeToNothing = () => () => {};

/**
 * Renders children into another part of the DOM (usually `document.body`) so
 * overlays escape `overflow: hidden` and stacking contexts. Renders nothing
 * on the server and during hydration, then mounts on the client.
 */
export function Portal({ children, container }: PortalProps) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!isClient) return null;
  return createPortal(children, container ?? document.body);
}
