import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './switch';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { 'aria-label': 'Wi-Fi' },
  argTypes: {
    checked: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onCheckedChange: { action: 'checkedChange' },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WrappingLabel: Story = {
  name: 'Labelled by a wrapping <label>',
  args: { 'aria-label': undefined },
  render: (args) => (
    <label className="kl-example-label">
      <Switch {...args} />
      Wi-Fi
    </label>
  ),
};

export const States: Story = {
  args: { 'aria-label': undefined },
  render: () => (
    <div className="kl-example-row">
      <label className="kl-example-label">
        <Switch /> Off
      </label>
      <label className="kl-example-label">
        <Switch defaultChecked /> On
      </label>
      <label className="kl-example-label">
        <Switch disabled /> Disabled off
      </label>
      <label className="kl-example-label">
        <Switch disabled defaultChecked /> Disabled on
      </label>
    </div>
  ),
};

export const LabelledByElsewhere: Story = {
  name: 'Labelled by htmlFor and aria-labelledby',
  args: { 'aria-label': undefined },
  render: () => (
    <div className="kl-example-stack">
      <div className="kl-example-label">
        <label htmlFor="dark-mode">Dark mode</label>
        <Switch id="dark-mode" />
      </div>
      <div className="kl-example-label">
        <span id="notifications-label">Notifications</span>
        <Switch aria-labelledby="notifications-label" aria-describedby="notifications-hint" />
      </div>
      <p id="notifications-hint" className="kl-example-note">
        Descriptions are announced after the state.
      </p>
    </div>
  ),
};

function ControlledExample() {
  const [isSyncing, setIsSyncing] = useState(true);
  return (
    <div className="kl-example-stack">
      <label className="kl-example-label">
        <Switch checked={isSyncing} onCheckedChange={setIsSyncing} />
        Sync over mobile data
      </label>
      <p className="kl-example-output">checked: {String(isSyncing)}</p>
    </div>
  );
}

export const Controlled: Story = {
  args: { 'aria-label': undefined },
  render: () => <ControlledExample />,
};

function FormExample() {
  const [submitted, setSubmitted] = useState('nothing yet');
  return (
    <form
      className="kl-example-form"
      onSubmit={(event) => {
        event.preventDefault();
        const entries = [...new FormData(event.currentTarget)].map(
          ([key, entryValue]) =>
            `${key}=${typeof entryValue === 'string' ? entryValue : entryValue.name}`,
        );
        setSubmitted(entries.join('&') || '(empty)');
      }}
    >
      <label className="kl-example-label">
        <Switch name="newsletter" value="weekly" /> Weekly newsletter
      </label>
      <button type="submit">Save</button>
      <output className="kl-example-output">Submitted: {submitted}</output>
    </form>
  );
}

export const InAForm: Story = {
  name: 'In a form',
  args: { 'aria-label': undefined },
  render: () => <FormExample />,
};

export const RightToLeft: Story = {
  name: 'Right to left',
  args: { 'aria-label': undefined },
  render: () => (
    <div dir="rtl" lang="ar" className="kl-example-row">
      <label className="kl-example-label">
        <Switch /> الوضع الليلي
      </label>
      <label className="kl-example-label">
        <Switch defaultChecked /> الإشعارات
      </label>
    </div>
  ),
};

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  args: { 'aria-label': undefined },
  render: () => (
    <div className="kl-example-stack">
      <button type="button">Before</button>
      <label className="kl-example-label">
        <Switch /> Wi-Fi
      </label>
      <label className="kl-example-label">
        <Switch disabled /> Airplane mode
      </label>
      <button type="button">After</button>
    </div>
  ),
};
