import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dialog } from '../dialog/dialog';
import { Menu } from './menu';

const meta = {
  title: 'Components/Menu',
  component: Menu.Root,
  argTypes: {
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    onOpenChange: { action: 'openChange' },
  },
  render: (args) => <ActionsExample {...args} />,
} satisfies Meta<typeof Menu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

function ActionsExample(rootProps: Parameters<typeof Menu.Root>[0]) {
  const [last, setLast] = useState('none');
  const choose = (action: string) => () => {
    setLast(action);
  };
  return (
    <div className="kl-example-stack">
      <Menu.Root {...rootProps}>
        <Menu.Trigger>Edit</Menu.Trigger>
        <Menu.Content>
          <Menu.Item shortcut="Ctrl+X" onSelect={choose('Cut')}>
            Cut
          </Menu.Item>
          <Menu.Item shortcut="Ctrl+C" onSelect={choose('Copy')}>
            Copy
          </Menu.Item>
          <Menu.Item shortcut="Ctrl+V" onSelect={choose('Paste')}>
            Paste
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={choose('Select all')}>Select all</Menu.Item>
        </Menu.Content>
      </Menu.Root>
      <p className="kl-example-output">Last action: {last}</p>
    </div>
  );
}

export const Playground: Story = {};

export const Basic: Story = { name: 'Actions with shortcuts' };

function CheckboxExample() {
  const [ruler, setRuler] = useState(true);
  const [grid, setGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  return (
    <div className="kl-example-stack">
      <Menu.Root>
        <Menu.Trigger>View</Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem checked={ruler} onCheckedChange={setRuler}>
            Show ruler
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked={grid} onCheckedChange={setGrid}>
            Show grid
          </Menu.CheckboxItem>
          <Menu.CheckboxItem checked={snap} onCheckedChange={setSnap}>
            Snap to grid
          </Menu.CheckboxItem>
        </Menu.Content>
      </Menu.Root>
      <p className="kl-example-output">
        ruler: {String(ruler)} · grid: {String(grid)} · snap: {String(snap)}
      </p>
    </div>
  );
}

export const CheckboxItems: Story = {
  name: 'Checkbox items',
  render: () => <CheckboxExample />,
};

function RadioExample() {
  const [sort, setSort] = useState('modified');
  return (
    <div className="kl-example-stack">
      <Menu.Root>
        <Menu.Trigger>Sort</Menu.Trigger>
        <Menu.Content>
          <Menu.RadioGroup value={sort} onValueChange={setSort}>
            <Menu.Label>Sort by</Menu.Label>
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
            <Menu.RadioItem value="modified">Date modified</Menu.RadioItem>
            <Menu.RadioItem value="size">Size</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>
      <p className="kl-example-output">sort: {sort}</p>
    </div>
  );
}

export const RadioItems: Story = {
  name: 'Radio group',
  render: () => <RadioExample />,
};

export const Groups: Story = {
  name: 'Groups, labels and separators',
  render: () => (
    <Menu.Root>
      <Menu.Trigger>Project</Menu.Trigger>
      <Menu.Content>
        <Menu.Group>
          <Menu.Label>Share</Menu.Label>
          <Menu.Item>Copy link</Menu.Item>
          <Menu.Item>Invite people…</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.Label>Export</Menu.Label>
          <Menu.Item>As PDF</Menu.Item>
          <Menu.Item>As PNG</Menu.Item>
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  ),
};

export const Disabled: Story = {
  name: 'Disabled items',
  render: () => (
    <Menu.Root>
      <Menu.Trigger>File</Menu.Trigger>
      <Menu.Content>
        <Menu.Item>New</Menu.Item>
        <Menu.Item>Open…</Menu.Item>
        <Menu.Item disabled shortcut="Ctrl+S">
          Save
        </Menu.Item>
        <Menu.Item disabled>Export</Menu.Item>
        <Menu.Item>Close</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  ),
};

function KeepOpenExample() {
  const [zoom, setZoom] = useState(100);
  return (
    <Menu.Root>
      <Menu.Trigger>Zoom: {zoom}%</Menu.Trigger>
      <Menu.Content>
        <Menu.Item
          onSelect={(event) => {
            event.preventDefault();
            setZoom((current) => current + 10);
          }}
        >
          Zoom in
        </Menu.Item>
        <Menu.Item
          onSelect={(event) => {
            event.preventDefault();
            setZoom((current) => Math.max(10, current - 10));
          }}
        >
          Zoom out
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item
          onSelect={() => {
            setZoom(100);
          }}
        >
          Reset and close
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}

export const KeepOpen: Story = {
  name: 'Keeping the menu open',
  render: () => <KeepOpenExample />,
};

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="kl-example-stack">
      <div className="kl-example-row">
        <Menu.Root open={open} onOpenChange={setOpen}>
          <Menu.Trigger>Options</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item>
            <Menu.Item>Archive</Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
      <p className="kl-example-output">open: {String(open)}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

export const Placement: Story = {
  name: 'Placement and flipping',
  render: () => (
    <div className="kl-example-stack">
      <div className="kl-example-row">
        <Menu.Root>
          <Menu.Trigger>Bottom, start</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Bottom start A</Menu.Item>
            <Menu.Item>Bottom start B</Menu.Item>
          </Menu.Content>
        </Menu.Root>
        <Menu.Root>
          <Menu.Trigger>Top, end</Menu.Trigger>
          <Menu.Content side="top" align="end">
            <Menu.Item>Top end A</Menu.Item>
            <Menu.Item>Top end B</Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
    </div>
  ),
};

function RightToLeftExample() {
  const [ruler, setRuler] = useState(true);
  return (
    <div dir="rtl" lang="ar">
      <Menu.Root>
        <Menu.Trigger>تعديل</Menu.Trigger>
        <Menu.Content>
          <Menu.Item shortcut="Ctrl+X">قص</Menu.Item>
          <Menu.Item shortcut="Ctrl+C">نسخ</Menu.Item>
          <Menu.Separator />
          <Menu.CheckboxItem checked={ruler} onCheckedChange={setRuler}>
            إظهار المسطرة
          </Menu.CheckboxItem>
        </Menu.Content>
      </Menu.Root>
    </div>
  );
}

export const RightToLeft: Story = {
  name: 'Right to left',
  render: () => <RightToLeftExample />,
};

function InDialogExample() {
  const [last, setLast] = useState('none');
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open document</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Quarterly report</Dialog.Title>
        <Dialog.Description>
          The menu opens in the top layer above the dialog, and Esc closes only the menu.
        </Dialog.Description>
        <div className="kl-example-stack">
          <Menu.Root>
            <Menu.Trigger>Document actions</Menu.Trigger>
            <Menu.Content>
              <Menu.Item
                onSelect={() => {
                  setLast('Rename');
                }}
              >
                Rename
              </Menu.Item>
              <Menu.Item
                onSelect={() => {
                  setLast('Move to folder');
                }}
              >
                Move to folder
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
          <p className="kl-example-output">Last action: {last}</p>
          <Dialog.Close>Close</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export const InsideDialog: Story = {
  name: 'Inside a dialog',
  render: () => <InDialogExample />,
};

function FixtureMenu() {
  const [last, setLast] = useState('none');
  const [wrap, setWrap] = useState(false);
  const [size, setSize] = useState('medium');
  const choose = (action: string) => () => {
    setLast(action);
  };
  return (
    <>
      <Menu.Root>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item shortcut="Ctrl+N" onSelect={choose('New file')}>
            New file
          </Menu.Item>
          <Menu.Item onSelect={choose('New window')}>New window</Menu.Item>
          <Menu.Item disabled onSelect={choose('Save')}>
            Save
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={choose('Duplicate')}>Duplicate</Menu.Item>
          <Menu.Item onSelect={choose('Delete')}>Delete</Menu.Item>
        </Menu.Content>
      </Menu.Root>
      <Menu.Root>
        <Menu.Trigger>Format</Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem checked={wrap} onCheckedChange={setWrap}>
            Wrap lines
          </Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.RadioGroup value={size} onValueChange={setSize}>
            <Menu.Label>Text size</Menu.Label>
            <Menu.RadioItem value="small">Small</Menu.RadioItem>
            <Menu.RadioItem value="medium">Medium</Menu.RadioItem>
            <Menu.RadioItem value="large">Large</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>
      <p className="kl-example-output">
        Last action: {last} · wrap: {String(wrap)} · size: {size}
      </p>
    </>
  );
}

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  render: () => (
    <div className="kl-example-stack">
      <button type="button">Before</button>
      <FixtureMenu />
      <button type="button">After</button>
    </div>
  ),
};
