import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dialog } from '../dialog/dialog';
import type { ToastTone } from './toast';
import { Toast, ToastProvider, useToast } from './toast';

const meta = {
  title: 'Components/Toast',
  component: ToastProvider,
  args: { limit: 3, duration: 6000, label: 'Notifications' },
  argTypes: {
    limit: { control: { type: 'number', min: 1 } },
    duration: { control: { type: 'number', min: 5000, step: 1000 } },
    label: { control: 'text' },
  },
  render: (args) => (
    <ToastProvider {...args}>
      <ToneButtons />
    </ToastProvider>
  ),
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const examples: Record<ToastTone, { title: string; description: string }> = {
  neutral: { title: 'Draft saved', description: 'Saved to your drafts a moment ago.' },
  success: { title: 'Invoice sent', description: 'Ada will get it by email.' },
  warning: { title: 'Storage almost full', description: '92% of 10 GB used.' },
  danger: { title: 'Upload failed', description: 'The connection dropped. Try again.' },
};

function ToneButtons() {
  const { toast } = useToast();
  return (
    <div className="kl-example-row">
      {(Object.keys(examples) as ToastTone[]).map((tone) => (
        <button
          key={tone}
          type="button"
          onClick={() => {
            toast({ ...examples[tone], tone });
          }}
        >
          Show {tone}
        </button>
      ))}
    </div>
  );
}

export const Playground: Story = {};

export const Tones: Story = {};

function ActionExample() {
  const { toast } = useToast();
  const [archived, setArchived] = useState<string[]>([]);
  const restore = (subject: string) => {
    setArchived((current) => current.filter((item) => item !== subject));
  };
  return (
    <div className="kl-example-stack">
      <button
        type="button"
        onClick={() => {
          const subject = `Weekly report ${String(archived.length + 1)}`;
          setArchived((current) => [...current, subject]);
          toast({
            title: 'Conversation archived',
            description: subject,
            action: {
              label: 'Undo',
              onClick: () => {
                restore(subject);
              },
            },
          });
        }}
      >
        Archive a conversation
      </button>
      <section aria-labelledby="archive-heading" className="kl-example-stack">
        <h3 id="archive-heading" className="kl-example-note">
          Archive (the same undo, somewhere that does not disappear)
        </h3>
        {archived.length === 0 ? (
          <p className="kl-example-note">Nothing archived.</p>
        ) : (
          <ul className="kl-example-stack">
            {archived.map((subject) => (
              <li key={subject} className="kl-example-row">
                {subject}
                <button
                  type="button"
                  onClick={() => {
                    restore(subject);
                  }}
                >
                  Restore {subject}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const WithAction: Story = {
  name: 'With an action',
  render: (args) => (
    <ToastProvider {...args}>
      <ActionExample />
    </ToastProvider>
  ),
};

function QueueButton() {
  const { toast, dismiss } = useToast();
  return (
    <div className="kl-example-row">
      <button
        type="button"
        onClick={() => {
          for (let index = 1; index <= 5; index++) toast({ title: `Message ${String(index)}` });
        }}
      >
        Send five
      </button>
      <button
        type="button"
        onClick={() => {
          dismiss();
        }}
      >
        Dismiss all
      </button>
    </div>
  );
}

export const Queue: Story = {
  name: 'Queue above the limit',
  render: (args) => (
    <ToastProvider {...args}>
      <QueueButton />
    </ToastProvider>
  ),
};

export const CustomLayout: Story = {
  name: 'Custom layout',
  render: (args) => (
    <ToastProvider
      {...args}
      renderToast={(toast) => (
        <Toast.Root>
          <Toast.Title />
          {toast.description && <Toast.Description />}
          <p className="kl-example-output">id: {toast.id}</p>
          <Toast.Close />
        </Toast.Root>
      )}
    >
      <ToneButtons />
    </ToastProvider>
  ),
};

function DialogExample() {
  const { toast } = useToast();
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open settings</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Settings</Dialog.Title>
        <Dialog.Description>
          Toasts shown while this is open move inside it, so they are still announced and their
          buttons still work.
        </Dialog.Description>
        <div className="kl-example-row">
          <button
            type="button"
            onClick={() => {
              toast({ title: 'Settings saved', tone: 'success' });
            }}
          >
            Save settings
          </button>
          <Dialog.Close>Close settings</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export const InsideADialog: Story = {
  name: 'While a dialog is open',
  render: (args) => (
    <ToastProvider {...args}>
      <DialogExample />
    </ToastProvider>
  ),
};

function RtlButton() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast({ title: 'تم حفظ المسودة', description: 'حُفظت في المسودات.', tone: 'success' });
      }}
    >
      إظهار إشعار
    </button>
  );
}

export const RightToLeft: Story = {
  name: 'Right to left',
  render: (args) => (
    <ToastProvider {...args} dir="rtl">
      <div dir="rtl" lang="ar">
        <RtlButton />
      </div>
    </ToastProvider>
  ),
};

function FixtureControls() {
  const { toast } = useToast();
  return (
    <div className="kl-example-stack">
      <button type="button">Before</button>
      <label className="kl-example-stack">
        Message
        <input />
      </label>
      <div className="kl-example-row">
        <button
          type="button"
          onClick={() => {
            toast({ title: 'Draft saved' });
          }}
        >
          Show neutral
        </button>
        <button
          type="button"
          onClick={() => {
            toast({ title: 'Upload failed', tone: 'danger' });
          }}
        >
          Show danger
        </button>
        <button
          type="button"
          onClick={() => {
            toast({ title: 'Archived', action: { label: 'Undo', onClick: () => {} } });
          }}
        >
          Show with action
        </button>
        <button
          type="button"
          onClick={() => {
            setTimeout(() => {
              toast({ title: 'Arrived while typing' });
            }, 500);
          }}
        >
          Show in half a second
        </button>
      </div>
      <DialogExample />
      <button type="button">After</button>
    </div>
  );
}

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  render: (args) => (
    <ToastProvider {...args}>
      <FixtureControls />
    </ToastProvider>
  ),
};
