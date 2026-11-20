import type { ComponentPropsWithRef, ReactNode, RefObject } from 'react';
import { createContext, use, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { composeRefs } from '../../primitives/compose-refs';
import { useAnchoredPopover } from '../../primitives/use-anchored-popover';
import { useControllableState } from '../../primitives/use-controllable-state';
import { useId } from '../../primitives/use-id';
import { classNames } from '../../utils/class-names';

/** Decides whether an option is shown for what is typed. */
export type ComboboxFilter = (optionText: string, inputValue: string) => boolean;

export interface ComboboxRootProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** Controlled selected option value. Pair with `onValueChange`. */
  value?: string;
  /** Option value selected on first render when uncontrolled. Default: none. */
  defaultValue?: string;
  /** Called with the chosen option's value, or `''` when the selection is cleared. */
  onValueChange?: (value: string) => void;
  /** Controlled text in the input. Pair with `onInputValueChange`. */
  inputValue?: string;
  /** Text in the input on first render. Default: the selected option's text. */
  defaultInputValue?: string;
  onInputValueChange?: (inputValue: string) => void;
  /** Controlled open state of the list. Pair with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Which options to show for the typed text. Default: options whose text
   * contains it, ignoring case and accents. `false` shows every option, for
   * results filtered elsewhere (a server search).
   */
  filter?: ComboboxFilter | false;
  /** Submits the selected value with a form, through a hidden input. */
  name?: string;
  disabled?: boolean;
  /**
   * The live announcement once typing settles, for localisation. Default:
   * "No results", "1 result", "3 results".
   */
  resultsMessage?: (count: number) => string;
}

export type ComboboxLabelProps = Omit<ComponentPropsWithRef<'label'>, 'id' | 'htmlFor'>;

export type ComboboxInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'id'
  | 'role'
  | 'value'
  | 'defaultValue'
  | 'disabled'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-autocomplete'
  | 'aria-activedescendant'
>;

export interface ComboboxTriggerProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'tabIndex' | 'disabled' | 'aria-expanded' | 'aria-controls' | 'children'
> {
  /** The button's accessible name. Default `'Show suggestions'`. */
  'aria-label'?: string;
}

export type ComboboxContentProps = Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'id' | 'popover' | 'onToggle' | 'aria-labelledby'
>;

export interface ComboboxOptionProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'id' | 'aria-selected' | 'aria-disabled'
> {
  value: string;
  /** Shown, and announced as unavailable, but cannot be chosen. */
  disabled?: boolean;
  /** The text to filter on and fill the input with. Default: `children`, when it is a string. */
  textValue?: string;
}

export type ComboboxGroupProps = Omit<ComponentPropsWithRef<'div'>, 'role' | 'aria-labelledby'>;
export type ComboboxGroupLabelProps = Omit<ComponentPropsWithRef<'div'>, 'id'>;
export type ComboboxEmptyProps = ComponentPropsWithRef<'div'>;

interface ComboboxContextValue {
  baseId: string;
  value: string;
  inputValue: string;
  /** What the options are filtered by: the typed text, or nothing while the input shows the choice. */
  query: string;
  open: boolean;
  activeValue: string | null;
  disabled: boolean;
  count: number;
  filter: ComboboxFilter | false;
  inputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
  close: () => void;
  setActiveValue: (value: string | null) => void;
  setCount: (count: number) => void;
  setSelectedText: (text: string) => void;
  select: (value: string, text: string) => void;
  type: (text: string) => void;
  settle: () => void;
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null);
const GroupContext = createContext<string | undefined>(undefined);

function useComboboxContext(part: string): ComboboxContextValue {
  const context = use(ComboboxContext);
  if (!context) throw new Error(`Keyline: Combobox.${part} must be inside Combobox.Root.`);
  return context;
}

/** Lower case without accents, so "cafe" finds "Café". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const contains: ComboboxFilter = (optionText, inputValue) =>
  fold(optionText).includes(fold(inputValue));

function defaultResultsMessage(count: number): string {
  return count === 0 ? 'No results' : count === 1 ? '1 result' : `${String(count)} results`;
}

// Values are free text; ids cannot contain whitespace.
function optionId(baseId: string, value: string): string {
  return `${baseId}-option-${value.replace(/\s/g, '_')}`;
}

function options(list: HTMLElement | null): HTMLElement[] {
  return Array.from(list?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
}

/*
 * Marks the part of `text` that matches `query`, ignoring case and accents
 * the way the default filter does. Each character is folded on its own, so
 * the match can be mapped back to where it is in the original text.
 */
function highlight(text: string, query: string): ReactNode {
  const needle = fold(query);
  let folded = '';
  const offsets: number[] = [];
  for (let index = 0; index < text.length; index++) {
    offsets.push(folded.length);
    folded += fold(text.charAt(index));
  }
  offsets.push(folded.length);
  const at = needle ? folded.indexOf(needle) : -1;
  const start = offsets.indexOf(at);
  if (at === -1 || start === -1) return text;
  const end = offsets.findIndex((offset) => offset >= at + needle.length);
  return (
    <>
      {text.slice(0, start)}
      <mark className="kl-combobox-match">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function Root({
  value: valueProp,
  defaultValue = '',
  onValueChange,
  inputValue: inputValueProp,
  defaultInputValue,
  onInputValueChange,
  open: openProp,
  onOpenChange,
  filter = contains,
  name,
  disabled = false,
  resultsMessage = defaultResultsMessage,
  className,
  children,
  ...divProps
}: ComboboxRootProps) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
    name: 'Combobox',
  });
  const [inputValue, setInputValue] = useControllableState({
    value: inputValueProp,
    defaultValue: defaultInputValue ?? '',
    onChange: onInputValueChange,
    name: 'Combobox',
  });
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: false,
    onChange: onOpenChange,
    name: 'Combobox',
  });
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [optionText, setSelectedText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [typedAt, setTypedAt] = useState(0);
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filledInitialText = useRef(defaultInputValue !== undefined);
  // The selected option reports its text; a cleared value has none, whatever was reported last.
  const selectedText = value ? optionText : '';

  // With no defaultInputValue, the input starts with the selected option's text, once the option has reported it.
  useLayoutEffect(() => {
    if (filledInitialText.current || !selectedText) return;
    filledInitialText.current = true;
    setInputValue(selectedText);
  }, [selectedText, setInputValue]);

  /*
   * One announcement per pause in typing, not per key: the region is emptied
   * on every keystroke (which is not read) and filled once typing settles.
   */
  useEffect(() => {
    if (!typedAt) return;
    const timer = setTimeout(() => {
      setAnnouncement(resultsMessage(options(listRef.current).length));
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [typedAt, resultsMessage]);

  const close = () => {
    setOpen(false);
    setActiveValue(null);
    // A count still waiting for typing to settle is stale once the list closes or an option is chosen.
    setTypedAt(0);
  };
  const select = (next: string, text: string) => {
    setValue(next);
    setSelectedText(text);
    setInputValue(text);
    close();
  };

  // Not memoised, like the other components: every part re-renders with Root anyway.
  const context: ComboboxContextValue = {
    baseId,
    value,
    inputValue,
    // After a choice the input holds the option's text; filtering by it would hide every other option.
    query: inputValue === selectedText ? '' : inputValue,
    open,
    activeValue,
    disabled,
    count,
    filter,
    inputRef,
    listRef,
    setOpen,
    close,
    setActiveValue,
    setCount,
    setSelectedText,
    select,
    type: (text) => {
      setInputValue(text);
      setOpen(true);
      setActiveValue(null);
      setAnnouncement('');
      setTypedAt(Date.now());
    },
    settle: () => {
      close();
      if (inputValue === selectedText) return;
      // Cleared text clears the choice; text naming an option exactly chooses it; anything else is undone.
      const exact = options(listRef.current).find(
        (option) =>
          fold(option.dataset.text ?? '') === fold(inputValue) &&
          option.getAttribute('aria-disabled') !== 'true',
      );
      if (!inputValue || exact) select(exact?.dataset.value ?? '', exact?.dataset.text ?? '');
      else setInputValue(selectedText);
    },
  };

  return (
    <ComboboxContext value={context}>
      <div {...divProps} className={classNames('kl-combobox', className)}>
        {children}
        <div role="status" className="kl-visually-hidden">
          {announcement}
        </div>
        {name !== undefined && (
          <input type="hidden" name={name} value={value} disabled={disabled} />
        )}
      </div>
    </ComboboxContext>
  );
}

function Label({ className, ...labelProps }: ComboboxLabelProps) {
  const { baseId } = useComboboxContext('Label');
  return (
    <label
      {...labelProps}
      id={`${baseId}-label`}
      htmlFor={`${baseId}-input`}
      className={classNames('kl-combobox-label', className)}
    />
  );
}

function Input({ className, onChange, onKeyDown, onBlur, ref, ...inputProps }: ComboboxInputProps) {
  const context = useComboboxContext('Input');
  const { baseId, open, activeValue, inputRef, listRef, setOpen, close, setActiveValue } = context;
  const composedRef = useMemo(() => composeRefs(inputRef, ref), [inputRef, ref]);

  return (
    <input
      autoComplete="off"
      {...inputProps}
      ref={composedRef}
      id={`${baseId}-input`}
      type="text"
      role="combobox"
      value={context.inputValue}
      disabled={context.disabled}
      aria-expanded={open}
      aria-controls={`${baseId}-list`}
      aria-autocomplete="list"
      aria-activedescendant={activeValue === null ? undefined : optionId(baseId, activeValue)}
      className={classNames('kl-combobox-input', className)}
      onChange={(event) => {
        onChange?.(event);
        context.type(event.target.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        // Keys during IME composition belong to the input method.
        if (event.defaultPrevented || event.nativeEvent.isComposing) return;
        const { key } = event;
        const items = options(listRef.current);
        const active = items.findIndex((item) => item.dataset.value === activeValue);

        if (key === 'ArrowDown' || key === 'ArrowUp') {
          event.preventDefault();
          // Alt+Down opens without moving; Alt+Up closes.
          if (event.altKey) {
            if (key === 'ArrowDown') setOpen(true);
            else close();
            return;
          }
          setOpen(true);
          const count = items.length;
          // From no active option, Down goes to the first and Up to the last; both wrap.
          const next =
            key === 'ArrowDown' ? (active + 1) % count : (active < 1 ? count : active) - 1;
          setActiveValue(items[next]?.dataset.value ?? null);
        } else if (key === 'Enter' && open && active !== -1) {
          // Nothing is active until the user arrows to it, so Enter never picks an option they did not choose.
          event.preventDefault();
          items[active]?.click();
        } else if (key === 'Escape') {
          // Esc closes the list, then clears the text; with neither, it is left for a dialog to close.
          if (open) close();
          else if (context.inputValue) context.select('', '');
          else return;
          event.preventDefault();
        } else if (key === 'Tab') {
          close();
        } else if (['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          // The caret moves in the text, so visual focus goes back to the input too.
          setActiveValue(null);
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        context.settle();
      }}
    />
  );
}

function Trigger({
  className,
  onClick,
  onPointerDown,
  'aria-label': label = 'Show suggestions',
  ...buttonProps
}: ComboboxTriggerProps) {
  const { baseId, open, disabled, inputRef, setOpen, close } = useComboboxContext('Trigger');
  return (
    <button
      {...buttonProps}
      aria-label={label}
      type="button"
      // APG: the input is the one tab stop; the button is for pointers.
      tabIndex={-1}
      disabled={disabled}
      aria-expanded={open}
      aria-controls={`${baseId}-list`}
      className={classNames('kl-combobox-trigger', className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        // Focus stays in the input.
        event.preventDefault();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        inputRef.current?.focus();
        if (open) close();
        else setOpen(true);
      }}
    />
  );
}

function Content({ className, onPointerDown, ref, children, ...divProps }: ComboboxContentProps) {
  const { baseId, open, activeValue, count, listRef, inputRef, setOpen, setCount } =
    useComboboxContext('Content');
  const popover = useAnchoredPopover<HTMLDivElement>({
    open,
    onOpenChange: setOpen,
    anchorRef: inputRef,
    // Manual: focus stays in the input, and the input's blur closes the list.
    mode: 'manual',
    matchAnchorWidth: true,
  });
  const composedRef = useMemo(
    () => composeRefs(popover.ref, listRef, ref),
    [popover.ref, listRef, ref],
  );

  // Every render: filtering happens in the options, so the count is read from what rendered.
  useLayoutEffect(() => {
    setCount(options(listRef.current).length);
  });

  useEffect(() => {
    if (activeValue !== null) {
      document.getElementById(optionId(baseId, activeValue))?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeValue, baseId]);

  return (
    // Focus never comes here: the input keeps it and points at the active option.
    <div
      {...divProps}
      {...popover}
      ref={composedRef}
      // A listbox must hold options; with none left it is a plain box around Combobox.Empty.
      role={count ? 'listbox' : undefined}
      id={`${baseId}-list`}
      aria-labelledby={count ? `${baseId}-label` : undefined}
      className={classNames('kl-combobox-content', className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        // A press on an option (or the scrollbar) must not blur the input before the click lands.
        event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

function Option({
  value,
  disabled,
  textValue,
  className,
  onClick,
  onPointerMove,
  children,
  ...divProps
}: ComboboxOptionProps) {
  const context = useComboboxContext('Option');
  const { baseId, query, filter, activeValue, setActiveValue, setSelectedText } = context;
  const text = textValue ?? (typeof children === 'string' ? children : '');
  const isSelected = context.value === value;
  const isActive = activeValue === value;

  useLayoutEffect(() => {
    if (isSelected) setSelectedText(text);
  }, [isSelected, text, setSelectedText]);

  if (filter && query && !filter(text, query)) return null;

  return (
    // Keys are handled on the input, which keeps focus and points here with aria-activedescendant.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      {...divProps}
      role="option"
      id={optionId(baseId, value)}
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      data-value={value}
      data-text={text}
      data-active={isActive ? '' : undefined}
      className={classNames('kl-combobox-option', className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!isActive) setActiveValue(value);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) context.select(value, text);
      }}
    >
      {/* One flex item, so the gap does not split the text around the mark. */}
      <span className="kl-combobox-option-label">
        {typeof children === 'string' ? highlight(children, query) : children}
      </span>
    </div>
  );
}

function Group({ className, children, ...divProps }: ComboboxGroupProps) {
  const labelId = useId();
  return (
    <GroupContext value={labelId}>
      <div
        {...divProps}
        role="group"
        aria-labelledby={labelId}
        className={classNames('kl-combobox-group', className)}
      >
        {children}
      </div>
    </GroupContext>
  );
}

function GroupLabel({ className, ...divProps }: ComboboxGroupLabelProps) {
  return (
    <div
      {...divProps}
      id={use(GroupContext)}
      className={classNames('kl-combobox-group-label', className)}
    />
  );
}

function Empty({ className, ...divProps }: ComboboxEmptyProps) {
  const { count } = useComboboxContext('Empty');
  if (count) return null;
  return <div {...divProps} className={classNames('kl-combobox-empty', className)} />;
}

/**
 * An editable combobox with a filtered list of options, following the
 * WAI-ARIA APG Combobox pattern (list autocomplete). Focus stays in the
 * input; the active option is pointed at with `aria-activedescendant`. The
 * list is a manual native popover anchored to the input, so it needs no
 * portal and works inside a modal dialog.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */
export const Combobox = {
  Root,
  Label,
  Input,
  Trigger,
  Content,
  Option,
  Group,
  GroupLabel,
  Empty,
};
