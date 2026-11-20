import type { ComponentPropsWithRef, RefObject } from 'react';
import { createContext, use, useEffect, useMemo, useRef } from 'react';
import { composeRefs } from '../../primitives/compose-refs';
import { useControllableState } from '../../primitives/use-controllable-state';
import { useId } from '../../primitives/use-id';
import { useRovingFocus } from '../../primitives/use-roving-focus';
import { classNames } from '../../utils/class-names';

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsActivationMode = 'automatic' | 'manual';

export interface TabsRootProps extends Omit<ComponentPropsWithRef<'div'>, 'defaultValue'> {
  /** Controlled selected tab. Pair with `onValueChange`. */
  value?: string;
  /** Tab selected on first render when uncontrolled. Default: the first enabled tab. */
  defaultValue?: string;
  /**
   * Called with the newly selected value: when the user selects a tab, and
   * when selection falls back because the selected tab was disabled or removed.
   */
  onValueChange?: (value: string) => void;
  /** Which arrow keys move between tabs. Default `'horizontal'`. */
  orientation?: TabsOrientation;
  /**
   * `'automatic'` selects a tab as soon as it receives focus; `'manual'` waits
   * for Enter or Space. Default `'automatic'`.
   */
  activationMode?: TabsActivationMode;
}

export type TabsListProps = ComponentPropsWithRef<'div'>;

export interface TabsTabProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'role' | 'id' | 'value' | 'aria-selected' | 'aria-controls' | 'tabIndex'
> {
  /** Identifies the tab and its panel. */
  value: string;
  /** Removes the tab from keyboard navigation and selection. */
  disabled?: boolean;
}

export interface TabsPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'role' | 'id' | 'aria-labelledby' | 'hidden'
> {
  /** The `value` of the tab that shows this panel. */
  value: string;
  /** Keep the content rendered (hidden) while the panel is inactive, so its state survives. */
  keepMounted?: boolean;
}

interface TabsContextValue {
  baseId: string;
  value: string;
  orientation: TabsOrientation;
  activationMode: TabsActivationMode;
  select: (value: string) => void;
  listRef: RefObject<HTMLDivElement | null>;
  syncSelection: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(part: string): TabsContextValue {
  const context = use(TabsContext);
  if (!context) throw new Error(`Keyline: Tabs.${part} must be inside Tabs.Root.`);
  return context;
}

// Values are free text; ids cannot contain whitespace.
function partId(baseId: string, part: 'tab' | 'panel', value: string): string {
  return `${baseId}-${part}-${value.replace(/\s/g, '_')}`;
}

/*
 * The tab closest to where the lost selection was, preferring the one that
 * slid into its place, so removing a tab feels like closing a browser tab.
 */
function nearestEnabled(tabs: HTMLButtonElement[], fromIndex: number) {
  for (let distance = 0; distance < tabs.length; distance++) {
    const after = tabs[fromIndex + distance];
    if (after && !after.disabled) return after;
    const before = tabs[fromIndex - distance - 1];
    if (before && !before.disabled) return before;
  }
  return undefined;
}

function Root({
  value: valueProp,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  activationMode = 'automatic',
  id,
  className,
  ref,
  children,
  ...divProps
}: TabsRootProps) {
  // '' stands for "nothing selected yet"; the first sync replaces it with the first enabled tab.
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? '',
    onChange: onValueChange,
    name: 'Tabs',
  });
  const baseId = useId(id);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = useRef(0);
  const requestedFallback = useRef<string>(undefined);

  /*
   * Reads the rendered tabs rather than a registry, so a tab that disappears
   * or turns disabled is noticed however it happened. Runs from each tab's
   * effects (mount, unmount, and every render), after React has committed
   * the DOM it is checking. Not memoised, like the context below: the tabs
   * are this component's children, so they re-render with it regardless.
   */
  const syncSelection = () => {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const selected = tabs.findIndex((tab) => tab.dataset.value === value);
    const selectedTab = tabs[selected];
    if (selectedTab) {
      selectedIndex.current = selected;
      if (!selectedTab.disabled) {
        requestedFallback.current = undefined;
        return;
      }
    }

    // A disabled selected tab is treated as removed, so its neighbours compete the same way.
    const candidates = tabs.filter((_, index) => index !== selected);
    const fallback = nearestEnabled(candidates, selectedIndex.current);
    const fallbackValue = fallback?.dataset.value;
    // Every tab runs this in the same commit; ask once, or a controlled parent hears it N times.
    if (fallbackValue === undefined || fallbackValue === requestedFallback.current) return;
    requestedFallback.current = fallbackValue;
    setValue(fallbackValue);
  };

  const context: TabsContextValue = {
    baseId,
    value,
    orientation,
    activationMode,
    select: setValue,
    listRef,
    syncSelection,
  };

  return (
    <TabsContext value={context}>
      <div
        {...divProps}
        ref={ref}
        id={id}
        className={classNames('kl-tabs', className)}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext>
  );
}

function List({ className, onKeyDown, ref, children, ...divProps }: TabsListProps) {
  const { orientation, activationMode, select, listRef } = useTabsContext('List');
  const composedRef = useMemo(() => composeRefs(listRef, ref), [listRef, ref]);

  const handleRovingKeyDown = useRovingFocus({
    itemSelector: '[role="tab"]',
    orientation,
    onNavigate: (tab) => {
      const tabValue = tab.dataset.value;
      if (activationMode === 'automatic' && tabValue !== undefined) select(tabValue);
    },
  });

  useEffect(() => {
    // Same inline guard as Switch, so production builds drop the warning.
    if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
    const list = listRef.current;
    if (list && !list.getAttribute('aria-label')?.trim() && !list.hasAttribute('aria-labelledby')) {
      console.warn(
        'Keyline: Tabs.List has no accessible name, so screen readers announce an unnamed "tab list". Pass aria-label, or aria-labelledby pointing at a visible heading.',
      );
    }
  }, [listRef]);

  return (
    // The tabs are the focus stops, not the list (APG roving tabindex).
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      {...divProps}
      ref={composedRef}
      role="tablist"
      aria-orientation={orientation}
      data-orientation={orientation}
      className={classNames('kl-tabs-list', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        handleRovingKeyDown(event);
      }}
    >
      {children}
    </div>
  );
}

function Tab({ value, disabled, className, onClick, ref, children, ...buttonProps }: TabsTabProps) {
  const context = useTabsContext('Tab');
  const { baseId, orientation, select, syncSelection } = context;
  const isSelected = context.value === value;

  useEffect(() => {
    syncSelection();
    return syncSelection;
  }, [syncSelection, disabled, value]);

  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      role="tab"
      id={partId(baseId, 'tab', value)}
      aria-selected={isSelected}
      aria-controls={partId(baseId, 'panel', value)}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      data-value={value}
      data-state={isSelected ? 'active' : 'inactive'}
      data-disabled={disabled ? '' : undefined}
      data-orientation={orientation}
      className={classNames('kl-tabs-tab', className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(value);
      }}
    >
      <span className="kl-tab-label">{children}</span>
    </button>
  );
}

function Panel({
  value,
  keepMounted = false,
  className,
  ref,
  children,
  ...divProps
}: TabsPanelProps) {
  const context = useTabsContext('Panel');
  const isSelected = context.value === value;

  return (
    <div
      // APG: the panel is a tab stop so Tab moves from the tab list into the content.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      {...divProps}
      ref={ref}
      role="tabpanel"
      id={partId(context.baseId, 'panel', value)}
      aria-labelledby={partId(context.baseId, 'tab', value)}
      hidden={!isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      data-orientation={context.orientation}
      className={classNames('kl-tabs-panel', className)}
    >
      {(isSelected || keepMounted) && children}
    </div>
  );
}

/**
 * Layered sections of content shown one at a time, following the WAI-ARIA
 * APG Tabs pattern: one tab stop for the whole tab list, arrow keys between
 * tabs, and each panel labelled by its tab.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export const Tabs = { Root, List, Tab, Panel };
