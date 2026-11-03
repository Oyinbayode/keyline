import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from './use-controllable-state';

describe('useControllableState', () => {
  describe('uncontrolled', () => {
    it('starts at the default value and updates itself', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useControllableState({ defaultValue: false, onChange }));

      expect(result.current[0]).toBe(false);
      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
      expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('accepts an updater function', () => {
      const { result } = renderHook(() => useControllableState({ defaultValue: 1 }));

      act(() => {
        result.current[1]((count) => count + 1);
      });

      expect(result.current[0]).toBe(2);
    });

    it('does not call onChange when the value is unchanged', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useControllableState({ defaultValue: 'a', onChange }));

      act(() => {
        result.current[1]('a');
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('controlled', () => {
    it('reports changes without updating until the parent passes a new value', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ value }) => useControllableState({ value, defaultValue: false, onChange }),
        { initialProps: { value: false } },
      );

      act(() => {
        result.current[1](true);
      });
      expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(result.current[0]).toBe(false);

      rerender({ value: true });
      expect(result.current[0]).toBe(true);
    });

    it('ignores defaultValue when a value is passed', () => {
      const { result } = renderHook(() =>
        useControllableState({ value: 'controlled', defaultValue: 'default' }),
      );

      expect(result.current[0]).toBe('controlled');
    });

    it('resolves updater functions against the controlled value', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState({ value: 5, defaultValue: 0, onChange }),
      );

      act(() => {
        result.current[1]((count) => count * 2);
      });

      expect(onChange).toHaveBeenCalledExactlyOnceWith(10);
    });
  });

  it('warns in development when switching from uncontrolled to controlled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const initialProps: { value: boolean | undefined } = { value: undefined };
    const { rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: false, name: 'Switch' }),
      { initialProps },
    );

    rerender({ value: true });

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Switch changed from uncontrolled to controlled'),
    );
  });
});
