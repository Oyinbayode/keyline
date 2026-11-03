import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseControllableStateOptions<T> {
  /** The controlled value. Leave `undefined` to let the hook own the state. */
  value?: T | undefined;
  /** The initial value when uncontrolled. */
  defaultValue: T;
  /** Called whenever the value changes, in both modes. */
  onChange?: ((next: T) => void) | undefined;
  /** Used in the development warning when a component flips between modes. */
  name?: string;
}

type StateUpdate<T> = T | ((previous: T) => T);

function isUpdater<T>(update: StateUpdate<T>): update is (previous: T) => T {
  return typeof update === 'function';
}

/**
 * State that a parent can either own (controlled) or leave to the component
 * (uncontrolled), behind one setter. Every stateful Keyline component uses
 * this so the two modes cannot drift apart.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  name = 'component',
}: UseControllableStateOptions<T>): [T, (update: StateUpdate<T>) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const wasControlled = useRef(isControlled);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && wasControlled.current !== isControlled) {
      const from = wasControlled.current ? 'controlled' : 'uncontrolled';
      const to = isControlled ? 'controlled' : 'uncontrolled';
      console.warn(
        `Keyline: ${name} changed from ${from} to ${to}. Pick one for the lifetime of the component: pass a defined value (controlled) or only a default (uncontrolled).`,
      );
    }
    wasControlled.current = isControlled;
  }, [isControlled, name]);

  const setValue = useCallback(
    (update: StateUpdate<T>) => {
      const nextValue = isUpdater(update) ? update(currentValue) : update;
      if (Object.is(nextValue, currentValue)) return;
      if (!isControlled) setUncontrolledValue(nextValue);
      onChange?.(nextValue);
    },
    [currentValue, isControlled, onChange],
  );

  return [currentValue, setValue];
}
