import type { ComponentPropsWithRef, FocusEvent, ReactNode } from 'react';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Portal } from '../../primitives/portal';
import { classNames } from '../../utils/class-names';
import { getTopModal, subscribeToModals } from '../../utils/modal-stack';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  /** Button text. The same action must also be available somewhere that does not disappear. */
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  /** Default `'neutral'`. `'danger'` is announced assertively; the others politely. */
  tone?: ToastTone;
  /** Milliseconds before it dismisses itself. At least 5000. Ignored when there is an action. */
  duration?: number;
  /** A toast with an action never dismisses itself. */
  action?: ToastAction;
}

export interface ToastData extends ToastOptions {
  id: string;
  tone: ToastTone;
  duration: number;
}

interface ToastRecord extends ToastData {
  closing?: boolean;
}

export interface ToastApi {
  /** Shows a toast (or queues it above `limit`) and returns its id. */
  toast: (options: ToastOptions) => string;
  /** Dismisses one toast, or every toast when called without an id. */
  dismiss: (id?: string) => void;
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** Most toasts shown at once; the rest wait in order. Default `3`. */
  limit?: number;
  /** Default time on screen in milliseconds. At least 5000. Default `6000`. */
  duration?: number;
  /** Name of the notifications landmark. Default `"Notifications"`. */
  label?: string;
  /** Custom layout for each toast, built from the Toast parts. */
  renderToast?: (toast: ToastData) => ReactNode;
  /**
   * Writing direction of the viewport. It is portalled to `<body>` (or into an
   * open dialog), so it inherits `<html dir>`, not the provider's ancestors.
   */
  dir?: 'ltr' | 'rtl';
}

interface Announcement {
  id: string;
  text: string;
  assertive: boolean;
  container: HTMLDialogElement | null;
}

const MIN_DURATION = 5000;
const toneLabels: Record<ToastTone, string> = {
  neutral: '',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
};

const ToastApiContext = createContext<ToastApi | null>(null);
const ToastItemContext = createContext<(ToastRecord & { dismiss: () => void }) | null>(null);

export function useToast(): ToastApi {
  const api = use(ToastApiContext);
  if (!api) throw new Error('Keyline: useToast must be inside ToastProvider.');
  return api;
}

function useToastItem(part: string) {
  const item = use(ToastItemContext);
  if (!item) throw new Error(`Keyline: Toast.${part} must be inside a toast.`);
  return item;
}

function clampDuration(duration: number): number {
  if (duration >= MIN_DURATION) return duration;
  // Same inline guard as Switch, so production builds drop the warning.
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `Keyline: toast duration ${String(duration)} ms is shorter than the 5000 ms minimum, so it was raised to 5000 ms. People need time to read and reach a toast (WCAG 2.2.1).`,
    );
  }
  return MIN_DURATION;
}

/*
 * One timer per toast, but the time left lives in the provider: when the
 * viewport moves into or out of a dialog React remounts every toast, and a
 * fresh timer here would start the countdown again.
 */
function ToastItem({
  record,
  paused,
  remaining,
  dismiss,
  remove,
  children,
}: {
  record: ToastRecord;
  paused: boolean;
  remaining: Map<string, number>;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  children: ReactNode;
}) {
  const { id, closing, action, duration } = record;

  useEffect(() => {
    if (closing) {
      // Waits out the exit transition, which is 0ms under reduced motion.
      const item = document.getElementById(id);
      const exit = item ? parseFloat(getComputedStyle(item).transitionDuration) * 1000 : 0;
      const timer = setTimeout(() => {
        remove(id);
      }, exit || 0);
      return () => {
        clearTimeout(timer);
      };
    }
    if (paused || action || !Number.isFinite(duration)) return;

    const left = remaining.get(id) ?? duration;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      dismiss(id);
    }, left);
    return () => {
      clearTimeout(timer);
      remaining.set(id, left - (Date.now() - startedAt));
    };
  }, [id, closing, paused, action, duration, remaining, dismiss, remove]);

  const value = useMemo(
    () => ({
      ...record,
      dismiss: () => {
        dismiss(id);
      },
    }),
    [record, dismiss, id],
  );

  return <ToastItemContext value={value}>{children}</ToastItemContext>;
}

function DefaultToast({ description, action }: ToastData) {
  return (
    <Root>
      <Title />
      {description && <Description />}
      {action && <Action />}
      <Close />
    </Root>
  );
}

/**
 * Renders the notifications landmark and makes `useToast()` available.
 * Toasts never take focus. They are announced through two live regions that
 * exist before the first toast, so nothing is missed or read twice, and they
 * wait while the pointer is over them, focus is inside them, or the window is
 * in the background.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 */
export function ToastProvider({
  children,
  limit = 3,
  duration = 6000,
  label = 'Notifications',
  renderToast = DefaultToast,
  dir,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isWindowActive, setIsWindowActive] = useState(true);
  const [remaining] = useState(() => new Map<string, number>());
  const [announced] = useState(() => new Set<string>());
  const nextId = useRef(0);
  const viewportRef = useRef<HTMLElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  // A modal dialog makes everything outside it inert, live regions included.
  const container = useSyncExternalStore(subscribeToModals, getTopModal, () => null);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `kl-toast-${String((nextId.current += 1))}`;
      setToasts((current) => [
        ...current,
        {
          ...options,
          id,
          tone: options.tone ?? 'neutral',
          duration: clampDuration(options.duration ?? duration),
        },
      ]);
      return id;
    },
    [duration],
  );

  const dismiss = useCallback((id?: string) => {
    const focused = document.activeElement;
    const item = focused?.closest<HTMLElement>('.kl-toast');
    if (item && (!id || item.id === id)) {
      // Dismissing the focused toast must not drop focus to <body>.
      let next = item.nextElementSibling;
      while (next && (next as HTMLElement).dataset.state !== 'open') next = next.nextElementSibling;
      const target = id && next instanceof HTMLElement ? next : returnFocusTo.current;
      target?.focus();
    }
    setToasts((current) =>
      current.map((record) => (!id || record.id === id ? { ...record, closing: true } : record)),
    );
  }, []);

  const remove = useCallback(
    (id: string) => {
      remaining.delete(id);
      setToasts((current) => current.filter((record) => record.id !== id));
    },
    [remaining],
  );

  const visible = useMemo(() => toasts.slice(0, limit), [toasts, limit]);

  useEffect(() => {
    const fresh = visible.filter((record) => !announced.has(record.id));
    if (fresh.length === 0) return;
    fresh.forEach((record) => announced.add(record.id));
    const topModal = getTopModal();
    // A toast becomes visible from toast(), a timer, or a dismissal that frees a slot; reacting
    // to the visible list here covers all three in one place.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnouncements((current) => [
      ...current,
      ...fresh.map(({ id, title, description, tone }) => ({
        id,
        text: [toneLabels[tone] && `${toneLabels[tone]}:`, title, description]
          .filter(Boolean)
          .join(' '),
        assertive: tone === 'danger',
        container: topModal,
      })),
    ]);
  }, [visible, announced]);

  useEffect(() => {
    if (announcements.length === 0) return;
    // The speech is already queued; clearing keeps browse mode from reading every toast twice.
    const timer = setTimeout(() => {
      setAnnouncements([]);
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [announcements]);

  const hasToasts = visible.length > 0;
  // A toast removed from under the pointer fires no pointerleave; an empty viewport cannot be hovered.
  if (isHovered && !hasToasts) setIsHovered(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F8' || !hasToasts) return;
      event.preventDefault();
      viewportRef.current?.focus();
    };
    // A hidden tab or a window in the background both mean nobody is reading.
    const setActive = (event: Event) => {
      setIsWindowActive(
        event.type === 'visibilitychange'
          ? document.visibilityState === 'visible'
          : event.type === 'focus',
      );
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', setActive);
    window.addEventListener('blur', setActive);
    window.addEventListener('focus', setActive);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', setActive);
      window.removeEventListener('blur', setActive);
      window.removeEventListener('focus', setActive);
    };
  }, [hasToasts]);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const paused = isHovered || hasFocus || !isWindowActive;
  // Only announcements made in this container: a moved live region must not repeat itself.
  const here = announcements.filter((announcement) => announcement.container === container);
  const isOutside = (event: FocusEvent) =>
    !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget));

  return (
    <ToastApiContext value={api}>
      {children}
      <Portal container={container}>
        {/* Pointer handlers only pause timers; they are not an interaction. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <section
          ref={viewportRef}
          dir={dir}
          aria-label={`${label} (F8)`}
          tabIndex={-1}
          className="kl-toast-viewport"
          onPointerEnter={() => {
            setIsHovered(true);
          }}
          onPointerLeave={() => {
            setIsHovered(false);
          }}
          onFocus={(event) => {
            if (isOutside(event) && event.relatedTarget instanceof HTMLElement) {
              returnFocusTo.current = event.relatedTarget;
            }
            setHasFocus(true);
          }}
          onBlur={(event) => {
            if (isOutside(event)) setHasFocus(false);
          }}
        >
          {[false, true].map((assertive) => (
            <div
              key={String(assertive)}
              role={assertive ? 'alert' : 'status'}
              aria-atomic="false"
              className="kl-visually-hidden"
            >
              {here
                .filter((announcement) => announcement.assertive === assertive)
                .map((announcement) => (
                  <span key={announcement.id}>{announcement.text}</span>
                ))}
            </div>
          ))}
          <ol className="kl-toast-list">
            {visible.map((record) => (
              <ToastItem
                key={record.id}
                record={record}
                paused={paused}
                remaining={remaining}
                dismiss={dismiss}
                remove={remove}
              >
                {renderToast(record)}
              </ToastItem>
            ))}
          </ol>
        </section>
      </Portal>
    </ToastApiContext>
  );
}

/* Distinct shapes, so the tone never depends on colour: circle, tick, triangle, diamond. */
const toneIcons: Record<ToastTone, string> = {
  neutral: 'M8 1.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13ZM8 7v4.5M8 4.5v.5',
  success: 'M2.5 8.5l3.5 3.5l7.5-8',
  warning: 'M8 1.5L15 14H1ZM8 6v4M8 12v.5',
  danger: 'M8 1L15 8L8 15L1 8ZM6 6l4 4M10 6l-4 4',
};

export type ToastRootProps = Omit<ComponentPropsWithRef<'li'>, 'id'>;

function Root({ className, onKeyDown, children, ...itemProps }: ToastRootProps) {
  const { id, tone, closing, dismiss } = useToastItem('Root');
  const toneLabel = toneLabels[tone];

  return (
    // Esc bubbles here from the toast's own buttons, or from the toast after focus moved to it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      {...itemProps}
      id={id}
      tabIndex={-1}
      data-tone={tone}
      data-state={closing ? 'closed' : 'open'}
      className={classNames('kl-toast', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        // Also stops a surrounding modal dialog from treating this Esc as its own.
        event.preventDefault();
        dismiss();
      }}
    >
      <svg
        className="kl-toast-icon"
        viewBox="0 0 16 16"
        role={toneLabel ? 'img' : undefined}
        aria-label={toneLabel || undefined}
        aria-hidden={toneLabel ? undefined : true}
      >
        <path d={toneIcons[tone]} />
      </svg>
      {children}
    </li>
  );
}

export type ToastTitleProps = ComponentPropsWithRef<'p'>;

function Title({ className, children, ...paragraphProps }: ToastTitleProps) {
  const { title } = useToastItem('Title');
  return (
    <p {...paragraphProps} className={classNames('kl-toast-title', className)}>
      {children ?? title}
    </p>
  );
}

export type ToastDescriptionProps = ComponentPropsWithRef<'p'>;

function Description({ className, children, ...paragraphProps }: ToastDescriptionProps) {
  const { description } = useToastItem('Description');
  return (
    <p {...paragraphProps} className={classNames('kl-toast-description', className)}>
      {children ?? description}
    </p>
  );
}

export type ToastActionProps = Omit<ComponentPropsWithRef<'button'>, 'type'>;

function Action({ className, onClick, children, ...buttonProps }: ToastActionProps) {
  const { action, dismiss } = useToastItem('Action');
  return (
    <button
      {...buttonProps}
      type="button"
      className={classNames('kl-toast-action', className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        action?.onClick();
        dismiss();
      }}
    >
      {children ?? action?.label}
    </button>
  );
}

export type ToastCloseProps = Omit<ComponentPropsWithRef<'button'>, 'type'>;

function Close({ className, onClick, children, ...buttonProps }: ToastCloseProps) {
  const { title, dismiss } = useToastItem('Close');
  return (
    <button
      aria-label={`Dismiss: ${title}`}
      {...buttonProps}
      type="button"
      className={classNames('kl-toast-close', className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) dismiss();
      }}
    >
      {children ?? (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      )}
    </button>
  );
}

/** The parts of one toast, for a custom `renderToast` layout. */
export const Toast = { Root, Title, Description, Action, Close };
