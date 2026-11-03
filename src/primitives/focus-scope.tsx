import type { ComponentPropsWithRef } from 'react';
import { createContext, use, useEffect, useMemo, useRef, useState } from 'react';
import { composeRefs } from './compose-refs';
import { getTabbableElements } from './tabbable';

export interface FocusScopeProps extends ComponentPropsWithRef<'div'> {
  /** Keep keyboard focus inside the scope, wrapping at either end. Default `true`. */
  trapped?: boolean;
  /** Move focus into the scope on mount: the first tabbable element, else the container. Default `true`. */
  focusOnMount?: boolean;
  /** Return focus to whatever had it before the scope mounted. Default `true`. */
  restoreFocus?: boolean;
}

interface ScopeNode {
  parent: ScopeNode | null;
}

/*
 * Only the top trapped scope is active. A dialog opened from a dialog is
 * usually portalled outside the first one's DOM, so containment checks alone
 * cannot tell the outer scope to stand down.
 */
const scopeStack: ScopeNode[] = [];
const lastFocusedInScope = new WeakMap<ScopeNode, HTMLElement>();
const ParentScopeContext = createContext<ScopeNode | null>(null);

function isTopScope(scope: ScopeNode): boolean {
  return scopeStack.at(-1) === scope;
}

function isDescendantOf(candidate: ScopeNode, ancestor: ScopeNode): boolean {
  for (let node = candidate.parent; node; node = node.parent) {
    if (node === ancestor) return true;
  }
  return false;
}

/*
 * React runs a child's effects before its parent's, so when an outer and an
 * inner scope mount in the same commit the inner one activates first. Slotting
 * a scope below any of its descendants keeps the innermost scope on top.
 */
function activateScope(scope: ScopeNode) {
  const firstDescendant = scopeStack.findIndex((other) => isDescendantOf(other, scope));
  if (firstDescendant === -1) scopeStack.push(scope);
  else scopeStack.splice(firstDescendant, 0, scope);
}

function deactivateScope(scope: ScopeNode) {
  const index = scopeStack.indexOf(scope);
  if (index !== -1) scopeStack.splice(index, 1);
}

function focusElement(element: HTMLElement | null | undefined) {
  element?.focus({ preventScroll: true });
}

/**
 * Contains keyboard focus for modal surfaces (dialogs, drawers) per the
 * WAI-ARIA APG dialog pattern: Tab and Shift+Tab cycle through the scope's
 * tabbable elements, focus that escapes is pulled back, and focus returns to
 * the trigger when the scope unmounts.
 */
export function FocusScope({
  trapped = true,
  focusOnMount = true,
  restoreFocus = true,
  ref,
  children,
  ...divProps
}: FocusScopeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const composedRef = useMemo(() => composeRefs(containerRef, ref), [ref]);
  const parentScope = use(ParentScopeContext);
  const [scope] = useState<ScopeNode>(() => ({ parent: parentScope }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (focusOnMount && !container.contains(document.activeElement)) {
      focusElement(getTabbableElements(container)[0] ?? container);
    }

    return () => {
      if (restoreFocus && previouslyFocused?.isConnected) focusElement(previouslyFocused);
    };
    // Focus moves once per mount; toggling these props later must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !trapped) return;

    if (
      document.activeElement instanceof HTMLElement &&
      container.contains(document.activeElement)
    ) {
      lastFocusedInScope.set(scope, document.activeElement);
    }
    activateScope(scope);

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopScope(scope) || !(event.target instanceof HTMLElement)) return;
      if (container.contains(event.target)) {
        lastFocusedInScope.set(scope, event.target);
      } else {
        focusElement(
          lastFocusedInScope.get(scope) ?? getTabbableElements(container)[0] ?? container,
        );
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isTopScope(scope)) return;
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;

      const tabbables = getTabbableElements(container);
      const first = tabbables[0];
      const last = tabbables.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    // If the focused element is removed (a list item deleted, say) the browser
    // drops focus to <body>, which would let the next Tab leave the trap.
    const observer = new MutationObserver(() => {
      if (!isTopScope(scope)) return;
      if (document.activeElement === document.body || !document.activeElement) {
        focusElement(container);
      }
    });

    document.addEventListener('focusin', handleFocusIn);
    container.addEventListener('keydown', handleKeyDown);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      deactivateScope(scope);
    };
  }, [scope, trapped]);

  return (
    <ParentScopeContext value={scope}>
      <div tabIndex={-1} {...divProps} ref={composedRef}>
        {children}
      </div>
    </ParentScopeContext>
  );
}
