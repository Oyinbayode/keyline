import type {
  ComponentPropsWithRef,
  Dispatch,
  MouseEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { composeRefs } from '../../primitives/compose-refs';
import { useControllableState } from '../../primitives/use-controllable-state';
import { useId } from '../../primitives/use-id';
import { classNames } from '../../utils/class-names';
import { pushModal, removeModal } from '../../utils/modal-stack';

export interface DialogRootProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Open on first render when uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  /**
   * Called with the requested state: `true` from the trigger, `false` from
   * Dialog.Close, Esc, a backdrop click, or the browser closing the dialog.
   * A controlled parent that keeps `open` true keeps the dialog open.
   */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export type DialogTriggerProps = Omit<
  ComponentPropsWithRef<'button'>,
  'type' | 'aria-haspopup' | 'aria-expanded'
>;

export interface DialogContentProps extends Omit<ComponentPropsWithRef<'dialog'>, 'open' | 'role'> {
  /** `'alertdialog'` for urgent confirmations; it never closes on a backdrop click. Default `'dialog'`. */
  role?: 'dialog' | 'alertdialog';
  /** Close when the pointer goes down and up on the backdrop. Default `true`; always `false` for alertdialog. */
  closeOnBackdropClick?: boolean;
  /** Element to focus on open. Default: the first tabbable element, else the dialog itself. */
  initialFocus?: RefObject<HTMLElement | null>;
}

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface DialogTitleProps extends Omit<ComponentPropsWithRef<'h2'>, 'id'> {
  /** Heading element to render. Default `'h2'`. */
  as?: HeadingLevel;
}

export type DialogDescriptionProps = Omit<ComponentPropsWithRef<'p'>, 'id'>;

export type DialogCloseProps = Omit<ComponentPropsWithRef<'button'>, 'type'>;

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  baseId: string;
  hasTitle: boolean;
  setHasTitle: Dispatch<SetStateAction<boolean>>;
  hasDescription: boolean;
  setHasDescription: Dispatch<SetStateAction<boolean>>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(part: string): DialogContextValue {
  const context = use(DialogContext);
  if (!context) throw new Error(`Keyline: Dialog.${part} must be inside Dialog.Root.`);
  return context;
}

function Root({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogRootProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Dialog',
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const [hasTitle, setHasTitle] = useState(false);
  const [hasDescription, setHasDescription] = useState(false);

  // Not memoised: Root renders only when its own state changes or its parent renders, and both reach every consumer anyway.
  const context: DialogContextValue = {
    open,
    setOpen,
    triggerRef,
    baseId,
    hasTitle,
    setHasTitle,
    hasDescription,
    setHasDescription,
  };

  return <DialogContext value={context}>{children}</DialogContext>;
}

function Trigger({ onClick, ref, ...buttonProps }: DialogTriggerProps) {
  const { open, setOpen, triggerRef } = useDialogContext('Trigger');
  const composedRef = useMemo(() => composeRefs(triggerRef, ref), [triggerRef, ref]);

  return (
    <button
      {...buttonProps}
      ref={composedRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
    />
  );
}

/*
 * Not the full getTabbableElements: inside an open modal dialog nothing is
 * inert or positively ordered in practice, so tab index, disabled state and
 * having a box (not display:none or [hidden]) are enough, and this is about
 * 300 B lighter. Chromium's own showModal() focus would pick a
 * tabindex="-1" element; this does not. jsdom lays nothing out, so there it
 * finds nothing and focus goes to the dialog; focus is asserted in Playwright.
 */
function firstTabbable(dialog: HTMLDialogElement): HTMLElement | undefined {
  return Array.from(dialog.querySelectorAll<HTMLElement>('*')).find(
    (element) =>
      element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0,
  );
}

/*
 * The dialog's own box is all of its content, so a click whose target is the
 * <dialog> and that lands outside its border box can only be on ::backdrop.
 */
function isOnBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
  const dialog = event.currentTarget;
  if (event.target !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

function Content({
  role = 'dialog',
  closeOnBackdropClick = true,
  initialFocus,
  className,
  onCancel,
  onClose,
  onPointerDown,
  onClick,
  ref,
  children,
  ...dialogProps
}: DialogContentProps) {
  const { open, setOpen, triggerRef, baseId, hasTitle, hasDescription } =
    useDialogContext('Content');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composedRef = useMemo(() => composeRefs(dialogRef, ref), [ref]);
  const returnFocusTo = useRef<Element | null>(null);
  const pointerDownOnBackdrop = useRef(false);
  // Re-runs the sync effect when the browser closed the dialog and the parent kept it open.
  const [reassertions, reassert] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (dialog.open) return;
      // Kept across a re-assert, which would otherwise record an element inside the dialog.
      returnFocusTo.current ??= document.activeElement;
      dialog.showModal();
      pushModal(dialog);
      (initialFocus?.current ?? firstTabbable(dialog) ?? dialog).focus();
      return;
    }

    if (dialog.open) dialog.close();
    removeModal(dialog);
    const previous = returnFocusTo.current;
    returnFocusTo.current = null;
    if (!previous) return;
    // The trigger may have been unmounted while the dialog was open; then there is nothing to return to.
    const target =
      previous.isConnected && previous !== document.body ? previous : triggerRef.current;
    if (target instanceof HTMLElement) target.focus();
  }, [open, reassertions, initialFocus, triggerRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog) removeModal(dialog);
    };
  }, []);

  useEffect(() => {
    // Same inline guard as Switch, so production builds drop the warning.
    if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
    const dialog = dialogRef.current;
    if (
      dialog &&
      !dialog.getAttribute('aria-label')?.trim() &&
      !dialog.hasAttribute('aria-labelledby') &&
      !document.getElementById(`${baseId}-title`)
    ) {
      console.warn(
        'Keyline: Dialog.Content has no accessible name, so screen readers announce only "dialog". Render a Dialog.Title inside it, or pass aria-label.',
      );
    }
  }, [baseId]);

  const backdropCloses = closeOnBackdropClick && role !== 'alertdialog';

  return (
    // The click handler is for backdrop clicks only; Esc (the cancel event) is the keyboard equivalent.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      aria-labelledby={hasTitle ? `${baseId}-title` : undefined}
      aria-describedby={hasDescription ? `${baseId}-description` : undefined}
      {...dialogProps}
      ref={composedRef}
      role={role === 'alertdialog' ? role : undefined}
      tabIndex={-1}
      data-state={open ? 'open' : 'closed'}
      className={classNames('kl-dialog', className)}
      onCancel={(event) => {
        onCancel?.(event);
        // React hands a nested dialog's cancel and close events to its ancestors too.
        if (event.target !== event.currentTarget) return;
        // Esc asks; the state decides. A controlled parent that refuses keeps it open.
        event.preventDefault();
        setOpen(false);
      }}
      onClose={(event) => {
        onClose?.(event);
        // Our own close() fires this too, after `open` is already false.
        if (!open || event.target !== event.currentTarget) return;
        setOpen(false);
        reassert();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        pointerDownOnBackdrop.current = isOnBackdrop(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        // Both ends on the backdrop, so a text selection dragged out of the dialog does not close it.
        if (backdropCloses && pointerDownOnBackdrop.current && isOnBackdrop(event)) setOpen(false);
        pointerDownOnBackdrop.current = false;
      }}
    >
      {children}
    </dialog>
  );
}

function Title({ as: Heading = 'h2', className, ...headingProps }: DialogTitleProps) {
  const { baseId, setHasTitle } = useDialogContext('Title');

  useLayoutEffect(() => {
    setHasTitle(true);
    return () => {
      setHasTitle(false);
    };
  }, [setHasTitle]);

  return (
    <Heading
      {...headingProps}
      id={`${baseId}-title`}
      className={classNames('kl-dialog-title', className)}
    />
  );
}

function Description({ className, ...paragraphProps }: DialogDescriptionProps) {
  const { baseId, setHasDescription } = useDialogContext('Description');

  useLayoutEffect(() => {
    setHasDescription(true);
    return () => {
      setHasDescription(false);
    };
  }, [setHasDescription]);

  return (
    <p
      {...paragraphProps}
      id={`${baseId}-description`}
      className={classNames('kl-dialog-description', className)}
    />
  );
}

function Close({ onClick, ...buttonProps }: DialogCloseProps) {
  const { setOpen } = useDialogContext('Close');

  return (
    <button
      {...buttonProps}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
    />
  );
}

/**
 * A modal dialog following the WAI-ARIA APG Dialog (Modal) pattern, built on
 * the native <dialog> element and `showModal()`. The browser provides the top
 * layer, the inert background, Esc, and focus containment; Keyline keeps React
 * state and the element in sync and handles initial focus, focus return,
 * backdrop clicks, and the scroll lock.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */
export const Dialog = { Root, Trigger, Content, Title, Description, Close };
