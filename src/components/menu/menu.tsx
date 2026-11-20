import type {
  ComponentPropsWithRef,
  Dispatch,
  MouseEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import { createContext, use, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { composeRefs } from '../../primitives/compose-refs';
import type { PopoverAlign, PopoverSide } from '../../primitives/use-anchored-popover';
import { useAnchoredPopover } from '../../primitives/use-anchored-popover';
import { useControllableState } from '../../primitives/use-controllable-state';
import { useId } from '../../primitives/use-id';
import { useTypeahead } from '../../primitives/use-typeahead';
import { classNames } from '../../utils/class-names';

export interface MenuRootProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Open on first render when uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  /**
   * Called with the requested state: `true` from the trigger, `false` from
   * Esc, Tab, choosing an item, a click outside, or the trigger again.
   */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export type MenuTriggerProps = Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'id' | 'aria-haspopup' | 'aria-expanded' | 'aria-controls'
>;

export interface MenuContentProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'id' | 'popover' | 'onToggle' | 'aria-labelledby'
> {
  /** Which side of the trigger the menu opens on; it flips when there is no room. Default `'bottom'`. */
  side?: PopoverSide;
  /** Which inline edge of the trigger it lines up with; mirrors in RTL. Default `'start'`. */
  align?: PopoverAlign;
}

/** A click on the item. Enter and Space on a focused item click it too. */
export type MenuSelectEvent = MouseEvent<HTMLDivElement>;

interface ItemBaseProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'tabIndex' | 'onSelect' | 'aria-disabled' | 'aria-checked'
> {
  /** Announced and focusable, but does nothing when activated. */
  disabled?: boolean;
}

export interface MenuItemProps extends ItemBaseProps {
  /** Called when the item is activated. Call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: MenuSelectEvent) => void;
  /** Shortcut text shown at the inline end, e.g. `'Ctrl+C'`. It is display only and read as the item's description. */
  shortcut?: string;
}

/*
 * Checkbox and radio items are controlled only: what they show is app state
 * (a view setting, a sort order) that already lives outside the menu.
 */
export interface MenuCheckboxItemProps extends ItemBaseProps {
  checked: boolean;
  /** Called with the new state when the item is activated. */
  onCheckedChange?: (checked: boolean) => void;
}

export interface MenuRadioGroupProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'defaultValue' | 'aria-labelledby'
> {
  /** The value of the checked item. */
  value: string;
  /** Called with the activated item's value. */
  onValueChange?: (value: string) => void;
}

export interface MenuRadioItemProps extends ItemBaseProps {
  value: string;
}

export type MenuGroupProps = Omit<ComponentPropsWithRef<'div'>, 'role' | 'aria-labelledby'>;
export type MenuLabelProps = Omit<ComponentPropsWithRef<'div'>, 'id'>;
export type MenuSeparatorProps = Omit<ComponentPropsWithRef<'div'>, 'role' | 'children'>;

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes the menu with focus back on the trigger. */
  close: () => void;
  baseId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Whether opening focuses the last item (Up Arrow on the trigger) instead of the first. */
  focusLastRef: RefObject<boolean>;
}

interface GroupContextValue {
  labelId: string;
  setHasLabel: Dispatch<SetStateAction<boolean>>;
}

interface RadioContextValue {
  value: string;
  onValueChange: ((value: string) => void) | undefined;
}

const MenuContext = createContext<MenuContextValue | null>(null);
const GroupContext = createContext<GroupContextValue | null>(null);
const RadioContext = createContext<RadioContextValue | null>(null);

function required<T>(context: T | null, part: string, parent = 'Root'): T {
  if (!context) throw new Error(`Keyline: Menu.${part} must be inside Menu.${parent}.`);
  return context;
}

function useMenuContext(part: string): MenuContextValue {
  return required(use(MenuContext), part);
}

const itemSelector = '[role^="menuitem"]';

function Root({ open: openProp, defaultOpen = false, onOpenChange, children }: MenuRootProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Menu',
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusLastRef = useRef(false);
  const baseId = useId();

  const close = () => {
    triggerRef.current?.focus();
    setOpen(false);
  };
  // Not memoised, like Dialog: every consumer re-renders with Root anyway.
  const context: MenuContextValue = { open, setOpen, close, baseId, triggerRef, focusLastRef };
  return <MenuContext value={context}>{children}</MenuContext>;
}

function Trigger({ onClick, onKeyDown, ref, ...buttonProps }: MenuTriggerProps) {
  const { open, setOpen, baseId, triggerRef, focusLastRef } = useMenuContext('Trigger');
  const composedRef = useMemo(() => composeRefs(triggerRef, ref), [triggerRef, ref]);

  return (
    <button
      {...buttonProps}
      ref={composedRef}
      type="button"
      id={`${baseId}-trigger`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? `${baseId}-content` : undefined}
      data-state={open ? 'open' : 'closed'}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        focusLastRef.current = false;
        setOpen(!open);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        const last = event.key === 'ArrowUp';
        // Enter and Space reach onClick as the button's own click.
        if (event.defaultPrevented || (!last && event.key !== 'ArrowDown')) return;
        event.preventDefault();
        focusLastRef.current = last;
        setOpen(true);
      }}
    />
  );
}

function Content({
  side,
  align,
  className,
  onKeyDown,
  ref,
  children,
  ...divProps
}: MenuContentProps) {
  const { open, setOpen, close, baseId, triggerRef, focusLastRef } = useMenuContext('Content');
  const popover = useAnchoredPopover<HTMLDivElement>({
    open,
    onOpenChange: setOpen,
    anchorRef: triggerRef,
    side,
    align,
  });
  const composedRef = useMemo(() => composeRefs(popover.ref, ref), [popover.ref, ref]);
  const typeahead = useTypeahead();

  // Runs after the popover hook's layout effect has shown the menu, so the item can take focus.
  useLayoutEffect(() => {
    if (!open) return;
    const items = popover.ref.current?.querySelectorAll<HTMLElement>(itemSelector) ?? [];
    items[focusLastRef.current ? items.length - 1 : 0]?.focus();
  }, [open, popover.ref, focusLastRef]);

  return (
    <div
      {...divProps}
      {...popover}
      ref={composedRef}
      role="menu"
      id={`${baseId}-content`}
      aria-labelledby={`${baseId}-trigger`}
      // Focus belongs on the items; this only catches it if the menu has none.
      tabIndex={-1}
      data-state={open ? 'open' : 'closed'}
      className={classNames('kl-menu', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector));
        // Keyboard events only fire on elements, never on text nodes.
        const current = items.indexOf(event.target as HTMLElement);

        // The label leads each item's text (the indicator is empty), so prefix matching sees the label first.
        const match = typeahead(
          event,
          items.map((menuItem) => menuItem.textContent),
          current,
        );
        items[match]?.focus();
        // A method call, not the property: the typeahead may have just prevented it.
        if (event.isDefaultPrevented()) return;

        const { key } = event;
        const count = items.length;
        // Up from the first item (or from nowhere) wraps to the last; Down wraps to the first.
        const target: Record<string, number> = {
          ArrowDown: current + 1,
          ArrowUp: Math.max(current, 0) - 1 + count,
          Home: 0,
          End: count - 1,
        };
        if (key in target) {
          items[(target[key] ?? 0) % count]?.focus();
        } else if (key === 'Enter' || key === ' ') {
          // Through click, so mouse, Enter and Space all reach onSelect the same way.
          items[current]?.click();
        } else if (key === 'Escape' || key === 'Tab') {
          /*
           * Esc is handled here so the browser's own Esc does not also close
           * a dialog the menu is in. Tab is not prevented: focus steps back
           * to the trigger and the browser moves it on from there.
           */
          close();
          if (key === 'Tab') return;
        } else {
          return;
        }
        event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

interface ItemBaseInternalProps extends ItemBaseProps {
  role: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  checked?: boolean;
  onActivate: (event: MenuSelectEvent) => boolean;
  shortcut?: string;
}

function ItemBase({
  role,
  checked,
  disabled,
  onActivate,
  shortcut,
  className,
  onClick,
  onPointerMove,
  children,
  ...divProps
}: ItemBaseInternalProps) {
  const { close } = useMenuContext('Item');
  const shortcutId = useId();

  return (
    // Keys are handled once for every item, on Menu.Content; the role is one of the menuitem roles.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      {...divProps}
      role={role}
      // APG: menu items take focus by script only, so Tab leaves the menu instead of walking it.
      tabIndex={-1}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-describedby={shortcut ? shortcutId : undefined}
      className={classNames('kl-menu-item', className)}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (document.activeElement !== event.currentTarget) event.currentTarget.focus();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        if (onActivate(event)) close();
      }}
    >
      {checked !== undefined && <span className="kl-menu-indicator" aria-hidden="true" />}
      <span className="kl-menu-item-label">{children}</span>
      {shortcut && (
        // Out of the name ("Copy", not "Copy Ctrl+C"), and read as the description instead.
        <span id={shortcutId} className="kl-menu-shortcut" aria-hidden="true">
          {shortcut}
        </span>
      )}
    </div>
  );
}

function Item({ onSelect, ...itemProps }: MenuItemProps) {
  return (
    <ItemBase
      {...itemProps}
      role="menuitem"
      onActivate={(event) => {
        onSelect?.(event);
        return !event.defaultPrevented;
      }}
    />
  );
}

function CheckboxItem({ checked, onCheckedChange, ...itemProps }: MenuCheckboxItemProps) {
  return (
    <ItemBase
      {...itemProps}
      role="menuitemcheckbox"
      checked={checked}
      onActivate={() => {
        onCheckedChange?.(!checked);
        return false;
      }}
    />
  );
}

function Group({ className, children, ...divProps }: MenuGroupProps) {
  const labelId = useId();
  const [hasLabel, setHasLabel] = useState(false);
  return (
    <GroupContext value={useMemo(() => ({ labelId, setHasLabel }), [labelId])}>
      <div
        {...divProps}
        role="group"
        aria-labelledby={hasLabel ? labelId : undefined}
        className={classNames('kl-menu-group', className)}
      >
        {children}
      </div>
    </GroupContext>
  );
}

function RadioGroup({ value, onValueChange, ...groupProps }: MenuRadioGroupProps) {
  return (
    <RadioContext value={{ value, onValueChange }}>
      <Group {...groupProps} />
    </RadioContext>
  );
}

function RadioItem({ value, ...itemProps }: MenuRadioItemProps) {
  const radio = required(use(RadioContext), 'RadioItem', 'RadioGroup');
  return (
    <ItemBase
      {...itemProps}
      role="menuitemradio"
      checked={radio.value === value}
      onActivate={() => {
        radio.onValueChange?.(value);
        return false;
      }}
    />
  );
}

function Label({ className, ...divProps }: MenuLabelProps) {
  const group = use(GroupContext);
  const setHasLabel = group?.setHasLabel;

  useLayoutEffect(() => {
    if (!setHasLabel) return;
    setHasLabel(true);
    return () => {
      setHasLabel(false);
    };
  }, [setHasLabel]);

  return (
    <div {...divProps} id={group?.labelId} className={classNames('kl-menu-label', className)} />
  );
}

function Separator({ className, ...divProps }: MenuSeparatorProps) {
  return (
    <div {...divProps} role="separator" className={classNames('kl-menu-separator', className)} />
  );
}

/**
 * A list of actions or options opened from a button, following the WAI-ARIA
 * APG Menu Button pattern. The menu is a native popover anchored to its
 * trigger with CSS anchor positioning, so it renders in the top layer
 * without a portal and still works inside a modal dialog. Focus moves
 * through the items with the arrow keys and typeahead (roving DOM focus).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 */
export const Menu = {
  Root,
  Trigger,
  Content,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Group,
  Label,
  Separator,
};
