import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { TabsRootProps } from './tabs';
import { Tabs } from './tabs';

const sections = [
  {
    value: 'account',
    label: 'Account',
    body: 'Name, email address, and the language Keyline uses for dates.',
  },
  {
    value: 'password',
    label: 'Password',
    body: 'Change your password or turn on a passkey.',
  },
  {
    value: 'billing',
    label: 'Billing',
    body: 'Invoices, payment method, and the billing contact.',
  },
];

function SettingsTabs({
  label = 'Settings',
  disabled = [],
  ...rootProps
}: Omit<TabsRootProps, 'children'> & { label?: string; disabled?: string[] }) {
  return (
    <Tabs.Root {...rootProps}>
      <Tabs.List aria-label={label}>
        {sections.map((section) => (
          <Tabs.Tab
            key={section.value}
            value={section.value}
            disabled={disabled.includes(section.value)}
          >
            {section.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {sections.map((section) => (
        <Tabs.Panel key={section.value} value={section.value}>
          <p className="kl-example-note">{section.body}</p>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

const meta = {
  title: 'Components/Tabs',
  component: Tabs.Root,
  args: { defaultValue: 'account' },
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: 'text' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    activationMode: { control: 'inline-radio', options: ['automatic', 'manual'] },
    onValueChange: { action: 'valueChange' },
  },
  render: (args) => <SettingsTabs {...args} />,
} satisfies Meta<typeof Tabs.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Horizontal: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const ManualActivation: Story = {
  name: 'Manual activation',
  args: { activationMode: 'manual' },
};

export const DisabledTab: Story = {
  name: 'Disabled tab',
  render: (args) => <SettingsTabs {...args} disabled={['password']} />,
};

function ControlledExample() {
  const [value, setValue] = useState('password');
  return (
    <div className="kl-example-stack">
      <SettingsTabs value={value} onValueChange={setValue} />
      <p className="kl-example-output">value: {value}</p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

function KeepMountedExample() {
  return (
    <Tabs.Root defaultValue="draft">
      <Tabs.List aria-label="Message">
        <Tabs.Tab value="draft">Draft</Tabs.Tab>
        <Tabs.Tab value="preview">Preview</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="draft" keepMounted tabIndex={-1}>
        <label className="kl-example-stack">
          Message
          <textarea rows={3} defaultValue="Type here, switch tabs, and come back." />
        </label>
      </Tabs.Panel>
      <Tabs.Panel value="preview">
        <p className="kl-example-note">The draft keeps its text because its panel stays mounted.</p>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

export const KeepMounted: Story = {
  name: 'Keep inactive panels mounted',
  render: () => <KeepMountedExample />,
};

export const RightToLeft: Story = {
  name: 'Right to left',
  render: () => (
    <div dir="rtl" lang="ar">
      <Tabs.Root defaultValue="account">
        <Tabs.List aria-label="الإعدادات">
          <Tabs.Tab value="account">الحساب</Tabs.Tab>
          <Tabs.Tab value="password">كلمة المرور</Tabs.Tab>
          <Tabs.Tab value="billing">الفواتير</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="account">
          <p className="kl-example-note">الاسم والبريد الإلكتروني.</p>
        </Tabs.Panel>
        <Tabs.Panel value="password">
          <p className="kl-example-note">غيّر كلمة المرور.</p>
        </Tabs.Panel>
        <Tabs.Panel value="billing">
          <p className="kl-example-note">الفواتير وطريقة الدفع.</p>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  ),
};

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  render: () => (
    <div className="kl-example-stack">
      <button type="button">Before</button>
      <SettingsTabs defaultValue="account" disabled={['password']} />
      <SettingsTabs label="Manual settings" activationMode="manual" defaultValue="account" />
      <SettingsTabs label="Vertical settings" orientation="vertical" defaultValue="account" />
      <button type="button">After</button>
    </div>
  ),
};
