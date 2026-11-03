import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeRefs } from './compose-refs';

describe('composeRefs', () => {
  it('assigns the node to object and callback refs, then clears them', () => {
    const objectRef = createRef<HTMLElement>();
    const callbackRef = vi.fn();
    const node = document.createElement('div');

    const cleanup = composeRefs(objectRef, callbackRef, undefined)(node);
    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenLastCalledWith(node);

    cleanup?.();
    expect(objectRef.current).toBeNull();
    expect(callbackRef).toHaveBeenLastCalledWith(null);
  });

  it('runs a callback ref’s own cleanup instead of calling it with null', () => {
    const ownCleanup = vi.fn();
    const callbackRef = vi.fn(() => ownCleanup);

    composeRefs(callbackRef)(document.createElement('div'))?.();

    expect(ownCleanup).toHaveBeenCalledOnce();
    expect(callbackRef).toHaveBeenCalledOnce();
  });
});
