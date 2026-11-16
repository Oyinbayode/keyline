import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { Dialog } from './dialog';

const meta = {
  title: 'Components/Dialog',
  component: Dialog.Root,
  argTypes: {
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    onOpenChange: { action: 'openChange' },
  },
  render: (args) => (
    <Dialog.Root {...args}>
      <Dialog.Trigger>Edit profile</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Changes are saved when you press Save.</Dialog.Description>
        <div className="kl-example-stack">
          <label className="kl-example-stack">
            Display name
            <input defaultValue="Ada" />
          </label>
          <div className="kl-example-row">
            <Dialog.Close>Cancel</Dialog.Close>
            <Dialog.Close>Save</Dialog.Close>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ),
} satisfies Meta<typeof Dialog.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Basic: Story = {};

export const AlertDialog: Story = {
  name: 'Alert dialog',
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger>Delete project</Dialog.Trigger>
      <Dialog.Content role="alertdialog">
        <Dialog.Title>Delete “Atlas”?</Dialog.Title>
        <Dialog.Description>
          This removes the project and its history for everyone. You cannot undo it.
        </Dialog.Description>
        <div className="kl-example-row">
          <Dialog.Close>Keep project</Dialog.Close>
          <Dialog.Close>Delete</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ),
};

function InitialFocusExample() {
  const emailRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog.Root>
      <Dialog.Trigger>Invite people</Dialog.Trigger>
      <Dialog.Content initialFocus={emailRef}>
        <Dialog.Title>Invite people</Dialog.Title>
        <Dialog.Description>
          Focus starts in the email field, not on the first control.
        </Dialog.Description>
        <div className="kl-example-stack">
          <label className="kl-example-stack">
            Team
            <select defaultValue="design">
              <option value="design">Design</option>
              <option value="engineering">Engineering</option>
            </select>
          </label>
          <label className="kl-example-stack">
            Email
            <input ref={emailRef} type="email" />
          </label>
          <Dialog.Close>Send invite</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export const InitialFocus: Story = {
  name: 'Initial focus',
  render: () => <InitialFocusExample />,
};

function UnsavedChangesExample() {
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [blocked, setBlocked] = useState(false);
  return (
    <div className="kl-example-stack">
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next && isDirty) {
            setBlocked(true);
            return;
          }
          setOpen(next);
          setBlocked(false);
        }}
      >
        <Dialog.Trigger>Write a note</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>New note</Dialog.Title>
          <Dialog.Description>
            Type something, then press Esc: the parent refuses to close while there are unsaved
            changes.
          </Dialog.Description>
          <div className="kl-example-stack">
            <label className="kl-example-stack">
              Note
              <textarea
                rows={3}
                onChange={(event) => {
                  setIsDirty(event.target.value !== '');
                }}
              />
            </label>
            {blocked && (
              <p className="kl-example-note" role="status">
                You have unsaved changes. Clear the note or discard it.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setIsDirty(false);
                setOpen(false);
                setBlocked(false);
              }}
            >
              Discard
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <p className="kl-example-output">open: {String(open)}</p>
    </div>
  );
}

export const Controlled: Story = {
  name: 'Controlled, refusing to close',
  render: () => <UnsavedChangesExample />,
};

export const Nested: Story = {
  name: 'Nested dialogs',
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger>Open settings</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Settings</Dialog.Title>
        <Dialog.Description>Esc closes only the topmost dialog.</Dialog.Description>
        <div className="kl-example-row">
          <Dialog.Root>
            <Dialog.Trigger>Reset settings…</Dialog.Trigger>
            <Dialog.Content role="alertdialog">
              <Dialog.Title>Reset all settings?</Dialog.Title>
              <div className="kl-example-row">
                <Dialog.Close>Cancel</Dialog.Close>
                <Dialog.Close>Reset</Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Root>
          <Dialog.Close>Done</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ),
};

const paragraphs = Array.from({ length: 12 }, (_, index) => index + 1);

export const LongContent: Story = {
  name: 'Long content and scroll lock',
  render: () => (
    <div className="kl-example-stack">
      <Dialog.Root>
        <Dialog.Trigger>Read the terms</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Terms of service</Dialog.Title>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="kl-example-note">
              Section {paragraph}. The dialog scrolls on its own; the page behind it does not move,
              and its scrollbar gutter is kept so nothing shifts sideways.
            </p>
          ))}
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  ),
};

export const RightToLeft: Story = {
  name: 'Right to left',
  render: () => (
    <div dir="rtl" lang="ar">
      <Dialog.Root>
        <Dialog.Trigger>تعديل الملف الشخصي</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>تعديل الملف الشخصي</Dialog.Title>
          <Dialog.Description>تُحفظ التغييرات عند الضغط على حفظ.</Dialog.Description>
          <div className="kl-example-row">
            <Dialog.Close>إلغاء</Dialog.Close>
            <Dialog.Close>حفظ</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  ),
};

function SelfRemovingTrigger() {
  const [showTrigger, setShowTrigger] = useState(true);
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) setShowTrigger(false);
      }}
    >
      {showTrigger && <Dialog.Trigger>Open, then lose the trigger</Dialog.Trigger>}
      <Dialog.Content aria-label="Orphaned dialog">
        <p className="kl-example-note">The button that opened this no longer exists.</p>
        <Dialog.Close>Close orphan</Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  render: () => (
    <div className="kl-example-stack">
      <button type="button">Before</button>
      <Dialog.Root>
        <Dialog.Trigger>Open form</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Form dialog</Dialog.Title>
          <p className="kl-example-note" tabIndex={-1}>
            Programmatically focusable only: initial focus must skip this.
          </p>
          <p className="kl-example-note">
            Select this sentence and drag past the dialog edge: the dialog must stay open.
          </p>
          <div className="kl-example-stack">
            <label className="kl-example-stack">
              Name
              <input />
            </label>
            <Dialog.Root>
              <Dialog.Trigger>Open nested</Dialog.Trigger>
              <Dialog.Content aria-label="Nested dialog">
                <Dialog.Close>Close nested</Dialog.Close>
              </Dialog.Content>
            </Dialog.Root>
            <Dialog.Close>Close form</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root>
        <Dialog.Trigger>Open text-only</Dialog.Trigger>
        <Dialog.Content role="alertdialog" aria-label="Text-only alert">
          <p className="kl-example-note">
            Nothing to focus here, so the dialog itself takes focus.
          </p>
        </Dialog.Content>
      </Dialog.Root>
      <SelfRemovingTrigger />
      <button type="button">After</button>
      <div className="kl-example-tall" aria-hidden="true" />
    </div>
  ),
};
