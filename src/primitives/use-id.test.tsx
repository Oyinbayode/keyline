import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useId } from './use-id';

describe('useId', () => {
  it('generates a prefixed id that is stable across renders', () => {
    const { result, rerender } = renderHook(() => useId());
    const firstId = result.current;

    rerender();

    expect(firstId).toMatch(/^keyline-/);
    expect(result.current).toBe(firstId);
  });

  it('generates different ids for different components', () => {
    const first = renderHook(() => useId()).result.current;
    const second = renderHook(() => useId()).result.current;

    expect(first).not.toBe(second);
  });

  it('prefers an id supplied by the consumer', () => {
    const { result } = renderHook(() => useId('billing-toggle'));

    expect(result.current).toBe('billing-toggle');
  });
});
