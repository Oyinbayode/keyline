import type { ComponentPropsWithRef } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { composeRefs } from '../../primitives/compose-refs';
import { useControllableState } from '../../primitives/use-controllable-state';
import { classNames } from '../../utils/class-names';

export interface SwitchProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'role' | 'value' | 'onChange' | 'aria-checked' | 'aria-pressed' | 'children'
> {
  /** Controlled on/off state. Pair with `onCheckedChange`. */
  checked?: boolean;
  /** Initial state when uncontrolled. Default `false`. */
  defaultChecked?: boolean;
  /** Called with the new state whenever the user toggles the switch. */
  onCheckedChange?: (checked: boolean) => void;
  /** Submits `name=value` with the surrounding form while the switch is on, like a checkbox. */
  name?: string;
  /** The value submitted when on. Default `"on"`. */
  value?: string;
}

function hasAccessibleName(button: HTMLButtonElement): boolean {
  return (
    button.labels.length > 0 ||
    Boolean(button.getAttribute('aria-label')?.trim()) ||
    button.hasAttribute('aria-labelledby') ||
    Boolean(button.title.trim())
  );
}

/**
 * An on/off control following the WAI-ARIA APG Switch pattern: a native
 * <button> with `role="switch"` and `aria-checked`, so Space and Enter toggle
 * it, it joins the tab order, and `disabled` removes it from the tab order,
 * all without custom key handling.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 */
export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  name,
  value = 'on',
  form,
  disabled,
  className,
  onClick,
  ref,
  ...buttonProps
}: SwitchProps) {
  const [checked, setChecked] = useControllableState({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
    name: 'Switch',
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const composedRef = useMemo(() => composeRefs(buttonRef, ref), [ref]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !buttonRef.current) return;
    if (!hasAccessibleName(buttonRef.current)) {
      console.warn(
        'Keyline: Switch has no accessible name, so screen readers will announce only "switch". Wrap it in a <label>, point a <label htmlFor> at its id, or pass aria-label / aria-labelledby.',
      );
    }
  }, []);

  return (
    <>
      <button
        {...buttonProps}
        ref={composedRef}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        form={form}
        className={classNames('kl-switch', className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setChecked((isOn) => !isOn);
        }}
      >
        <span className="kl-switch-thumb" aria-hidden="true" />
      </button>
      {name && checked && !disabled && (
        <input type="hidden" name={name} value={value} form={form} />
      )}
    </>
  );
}
