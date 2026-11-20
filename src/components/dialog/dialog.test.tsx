import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { stubDialogOpenState } from '../../../tests/stub-dialog';
import type { DialogContentProps, DialogRootProps } from './dialog';
import { Dialog } from './dialog';

stubDialogOpenState();

function Example({
  contentProps,
  withTitle = true,
  withDescription = true,
  ...rootProps
}: DialogRootProps & {
  contentProps?: DialogContentProps;
  withTitle?: boolean;
  withDescription?: boolean;
}) {
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Trigger>Delete project</Dialog.Trigger>
      <Dialog.Content {...contentProps}>
        {withTitle && <Dialog.Title>Delete “Atlas”?</Dialog.Title>}
        {withDescription && (
          <Dialog.Description>This removes the project and its history.</Dialog.Description>
        )}
        <Dialog.Close>Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Delete project' });
const dialogElement = () => document.querySelector('dialog') as HTMLDialogElement;
const isOpen = () => dialogElement().hasAttribute('open');

async function flushCloseEvent() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });
}

describe('Dialog', () => {
  describe('semantics', () => {
    it('wires the trigger with aria-haspopup and aria-expanded', async () => {
      const user = userEvent.setup();
      render(<Example />);

      expect(trigger()).toHaveAttribute('type', 'button');
      expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).toHaveAttribute('data-state', 'closed');

      await user.click(trigger());

      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(trigger()).toHaveAttribute('data-state', 'open');
    });

    it('renders a native <dialog> named by its title and described by its description', () => {
      render(<Example defaultOpen />);
      const dialog = screen.getByRole('dialog', { name: 'Delete “Atlas”?' });

      expect(dialog.tagName).toBe('DIALOG');
      expect(dialog).not.toHaveAttribute('role');
      expect(dialog).toHaveAccessibleDescription('This removes the project and its history.');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });

    it('renders the title as an h2 by default and another level with `as`', () => {
      const { unmount } = render(<Example defaultOpen />);
      expect(screen.getByRole('heading', { level: 2, name: 'Delete “Atlas”?' })).toBeVisible();
      unmount();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title as="h3">Settings</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );
      expect(screen.getByRole('heading', { level: 3, name: 'Settings' })).toBeVisible();
    });

    it('omits aria-labelledby and aria-describedby when there is no title or description', () => {
      render(
        <Example
          defaultOpen
          withTitle={false}
          withDescription={false}
          contentProps={{ 'aria-label': 'Confirm' }}
        />,
      );
      const dialog = screen.getByRole('dialog', { name: 'Confirm' });

      expect(dialog).not.toHaveAttribute('aria-labelledby');
      expect(dialog).not.toHaveAttribute('aria-describedby');
    });

    it('lets an explicit aria-labelledby win over the title', () => {
      render(
        <>
          <span id="external">External name</span>
          <Example defaultOpen contentProps={{ 'aria-labelledby': 'external' }} />
        </>,
      );

      expect(screen.getByRole('dialog', { name: 'External name' })).toBeInTheDocument();
    });

    it('uses role="alertdialog" when asked', () => {
      render(<Example defaultOpen contentProps={{ role: 'alertdialog' }} />);

      expect(screen.getByRole('alertdialog', { name: 'Delete “Atlas”?' })).toBeInTheDocument();
    });

    it('warns in development when the dialog has no accessible name', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<Example withTitle={false} />);

      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('no accessible name'));
    });

    it.each<[string, DialogContentProps | undefined, boolean]>([
      ['a Dialog.Title', undefined, true],
      ['aria-label', { 'aria-label': 'Confirm' }, false],
    ])('does not warn when named by %s', (_, contentProps, withTitle) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<Example contentProps={contentProps} withTitle={withTitle} />);

      expect(warn).not.toHaveBeenCalled();
    });

    it('throws a helpful error when a part is used outside Dialog.Root', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Dialog.Close>Close</Dialog.Close>)).toThrow(
        'Dialog.Close must be inside Dialog.Root',
      );
    });
  });

  describe('uncontrolled', () => {
    it('opens from the trigger and closes from Dialog.Close, reporting each change', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example onOpenChange={onOpenChange} />);

      expect(isOpen()).toBe(false);
      await user.click(trigger());
      expect(isOpen()).toBe(true);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(isOpen()).toBe(false);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it('starts open with defaultOpen', () => {
      render(<Example defaultOpen />);

      expect(isOpen()).toBe(true);
    });

    it('lets the trigger onClick cancel opening with preventDefault', async () => {
      const user = userEvent.setup();
      render(
        <Dialog.Root>
          <Dialog.Trigger
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            Open
          </Dialog.Trigger>
          <Dialog.Content aria-label="Example" />
        </Dialog.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      expect(isOpen()).toBe(false);
    });
  });

  describe('state sync with the browser', () => {
    it('turns Esc (the cancel event) into a close request instead of letting the browser close', () => {
      const onOpenChange = vi.fn();
      render(<Example defaultOpen onOpenChange={onOpenChange} />);
      const cancel = new Event('cancel', { cancelable: true });

      act(() => {
        dialogElement().dispatchEvent(cancel);
      });

      expect(cancel.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(isOpen()).toBe(false);
    });

    it('stays open when a controlled parent refuses the Esc request', () => {
      const onOpenChange = vi.fn();
      render(<Example open onOpenChange={onOpenChange} />);

      act(() => {
        dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }));
      });

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(isOpen()).toBe(true);
    });

    it('updates state when the browser closes the dialog itself', async () => {
      const onOpenChange = vi.fn();
      render(<Example defaultOpen onOpenChange={onOpenChange} />);

      act(() => {
        dialogElement().close();
      });
      await flushCloseEvent();

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(dialogElement()).toHaveAttribute('data-state', 'closed');
    });

    it('re-opens when the browser closes it but a controlled parent keeps it open', async () => {
      const onOpenChange = vi.fn();
      render(<Example open onOpenChange={onOpenChange} />);

      act(() => {
        dialogElement().close();
      });
      await flushCloseEvent();

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(isOpen()).toBe(true);
    });

    it('does not report a close it caused itself', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example defaultOpen onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await flushCloseEvent();

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('keeps a nested dialog’s cancel and close events from closing its parent', async () => {
      const onOuterChange = vi.fn();
      render(
        <Dialog.Root defaultOpen onOpenChange={onOuterChange}>
          <Dialog.Content aria-label="Outer">
            <Dialog.Root defaultOpen>
              <Dialog.Content aria-label="Inner" />
            </Dialog.Root>
          </Dialog.Content>
        </Dialog.Root>,
      );
      const [outer, inner] = Array.from(document.querySelectorAll('dialog'));

      act(() => {
        inner?.dispatchEvent(new Event('cancel', { cancelable: true }));
      });
      await flushCloseEvent();

      expect(inner).not.toHaveAttribute('open');
      expect(outer).toHaveAttribute('open');
      expect(onOuterChange).not.toHaveBeenCalled();
    });

    it('locks page scroll while open and restores it on close', async () => {
      const user = userEvent.setup();
      document.documentElement.style.overflow = 'auto';
      render(<Example />);

      await user.click(trigger());
      expect(document.documentElement.style.overflow).toBe('hidden');

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(document.documentElement.style.overflow).toBe('auto');
      document.documentElement.style.overflow = '';
    });

    it('releases the scroll lock when an open dialog unmounts', () => {
      const { unmount } = render(<Example defaultOpen />);
      expect(document.documentElement.style.overflow).toBe('hidden');

      unmount();

      expect(document.documentElement.style.overflow).toBe('');
    });
  });

  describe('controlled', () => {
    it('only changes when the parent passes a new value', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<Example open={false} onOpenChange={onOpenChange} />);

      await user.click(trigger());

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(isOpen()).toBe(false);
    });

    it('follows parent state', async () => {
      function Parent() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Example open={open} onOpenChange={setOpen} />
            <output>{open ? 'open' : 'closed'}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);

      await user.click(trigger());

      expect(isOpen()).toBe(true);
      expect(screen.getByText('open')).toBeInTheDocument();
    });
  });

  describe('composition', () => {
    it('forwards refs, className, and other props', () => {
      const triggerRef = createRef<HTMLButtonElement>();
      const contentRef = createRef<HTMLDialogElement>();
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Trigger ref={triggerRef} className="trigger">
            Open
          </Dialog.Trigger>
          <Dialog.Content ref={contentRef} className="content" data-testid="content">
            <Dialog.Title className="title">Title</Dialog.Title>
            <Dialog.Description className="description">Text</Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>,
      );

      expect(triggerRef.current).toBe(screen.getByRole('button', { name: 'Open' }));
      expect(triggerRef.current).toHaveClass('trigger');
      expect(contentRef.current).toBe(screen.getByTestId('content'));
      expect(contentRef.current).toHaveClass('kl-dialog', 'content');
      expect(screen.getByText('Title')).toHaveClass('kl-dialog-title', 'title');
      expect(screen.getByText('Text')).toHaveClass('kl-dialog-description', 'description');
    });

    it('still calls consumer onCancel and onClose handlers', async () => {
      const onCancel = vi.fn();
      const onClose = vi.fn();
      render(<Example defaultOpen contentProps={{ onCancel, onClose }} />);

      act(() => {
        dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }));
      });
      await flushCloseEvent();

      expect(onCancel).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close on clicks inside the dialog', () => {
      render(<Example defaultOpen />);

      fireEvent.pointerDown(screen.getByText('Delete “Atlas”?'));
      fireEvent.click(screen.getByText('Delete “Atlas”?'));

      expect(isOpen()).toBe(true);
    });
  });

  describe('axe', () => {
    it.each<[string, Parameters<typeof Example>[0]]>([
      ['closed', {}],
      ['open', { defaultOpen: true }],
      ['open as an alertdialog', { defaultOpen: true, contentProps: { role: 'alertdialog' } }],
      ['open without a description', { defaultOpen: true, withDescription: false }],
    ])('has no violations when %s', async (_, props) => {
      const { container } = render(<Example {...props} />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe('Dialog without a process global', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('imports and renders instead of throwing', async () => {
    vi.stubGlobal('process', undefined);

    const { Dialog: UnbundledDialog } = await import('./dialog');
    render(
      <UnbundledDialog.Root>
        <UnbundledDialog.Trigger>Open</UnbundledDialog.Trigger>
      </UnbundledDialog.Root>,
    );

    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});
