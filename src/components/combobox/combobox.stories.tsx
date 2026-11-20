import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Dialog } from '../dialog/dialog';
import type { ComboboxRootProps } from './combobox';
import { Combobox } from './combobox';

const fruits = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Clementine',
  'Coconut',
  'Damson',
  'Date',
  'Dragon fruit',
  'Elderberry',
  'Fig',
  'Gooseberry',
  'Grape',
  'Guava',
];

function FruitCombobox(rootProps: Omit<ComboboxRootProps, 'children'>) {
  return (
    <Combobox.Root {...rootProps}>
      <Combobox.Label>Fruit</Combobox.Label>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Content>
        {fruits.map((fruit) => (
          <Combobox.Option key={fruit} value={fruit.toLowerCase()}>
            {fruit}
          </Combobox.Option>
        ))}
        <Combobox.Empty>No fruit matches.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

const meta = {
  title: 'Components/Combobox',
  component: Combobox.Root,
  argTypes: {
    disabled: { control: 'boolean' },
    onValueChange: { action: 'valueChange' },
    onInputValueChange: { action: 'inputValueChange' },
    onOpenChange: { action: 'openChange' },
  },
  render: (args) => <FruitCombobox {...args} />,
} satisfies Meta<typeof Combobox.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Basic: Story = {};

export const Groups: Story = {
  name: 'Grouped options',
  render: () => (
    <Combobox.Root>
      <Combobox.Label>Time zone</Combobox.Label>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Group>
          <Combobox.GroupLabel>Africa</Combobox.GroupLabel>
          <Combobox.Option value="africa/lagos">Lagos</Combobox.Option>
          <Combobox.Option value="africa/nairobi">Nairobi</Combobox.Option>
          <Combobox.Option value="africa/accra">Accra</Combobox.Option>
        </Combobox.Group>
        <Combobox.Group>
          <Combobox.GroupLabel>Europe</Combobox.GroupLabel>
          <Combobox.Option value="europe/lisbon">Lisbon</Combobox.Option>
          <Combobox.Option value="europe/london">London</Combobox.Option>
          <Combobox.Option value="europe/zurich">Zürich</Combobox.Option>
        </Combobox.Group>
        <Combobox.Empty>No time zone matches.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  ),
};

export const DisabledOptions: Story = {
  name: 'Disabled options',
  render: () => (
    <Combobox.Root>
      <Combobox.Label>Delivery slot</Combobox.Label>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Option value="morning">Morning, 8–12</Combobox.Option>
        <Combobox.Option value="afternoon" disabled>
          Afternoon, 12–5 (full)
        </Combobox.Option>
        <Combobox.Option value="evening">Evening, 5–9</Combobox.Option>
      </Combobox.Content>
    </Combobox.Root>
  ),
};

function ControlledExample() {
  const [value, setValue] = useState('cherry');
  const [inputValue, setInputValue] = useState('Cherry');
  return (
    <div className="kl-example-stack">
      <FruitCombobox
        value={value}
        onValueChange={setValue}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
      />
      <p className="kl-example-output">
        value: {JSON.stringify(value)} · inputValue: {JSON.stringify(inputValue)}
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

const cities = [
  'Abuja',
  'Accra',
  'Addis Ababa',
  'Amsterdam',
  'Athens',
  'Bamako',
  'Bangkok',
  'Berlin',
  'Bogotá',
  'Cairo',
  'Dakar',
  'Lagos',
  'Lima',
  'Lisbon',
  'São Paulo',
];

/*
 * Stands in for a search request: the "server" filters, so the combobox is
 * told not to filter again with filter={false}.
 */
function ServerExample() {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState(cities);
  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(cities.filter((city) => city.toLowerCase().startsWith(inputValue.toLowerCase())));
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);
  return (
    <Combobox.Root filter={false} inputValue={inputValue} onInputValueChange={setInputValue}>
      <Combobox.Label>City (starts with, filtered by the “server”)</Combobox.Label>
      <Combobox.Input />
      <Combobox.Content>
        {results.map((city) => (
          <Combobox.Option key={city} value={city}>
            {city}
          </Combobox.Option>
        ))}
        <Combobox.Empty>No city starts with that.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

export const ServerSide: Story = {
  name: 'Filtered elsewhere',
  render: () => <ServerExample />,
};

function FormExample() {
  const [submitted, setSubmitted] = useState('nothing yet');
  return (
    <form
      className="kl-example-form"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
      }}
    >
      <FruitCombobox name="fruit" defaultValue="fig" />
      <button type="submit">Submit</button>
      <p className="kl-example-output">Submitted: {submitted}</p>
    </form>
  );
}

export const InAForm: Story = {
  name: 'In a form',
  render: () => <FormExample />,
};

export const Disabled: Story = {
  render: () => <FruitCombobox disabled defaultValue="banana" />,
};

const arabicResults = (count: number) =>
  count === 0 ? 'لا توجد نتائج' : count === 1 ? 'نتيجة واحدة' : `${String(count)} نتائج`;

export const RightToLeft: Story = {
  name: 'Right to left',
  render: () => (
    <div dir="rtl" lang="ar">
      <Combobox.Root resultsMessage={arabicResults}>
        <Combobox.Label>المدينة</Combobox.Label>
        <Combobox.Input />
        <Combobox.Trigger aria-label="إظهار الاقتراحات" />
        <Combobox.Content>
          <Combobox.Option value="cairo">القاهرة</Combobox.Option>
          <Combobox.Option value="alexandria">الإسكندرية</Combobox.Option>
          <Combobox.Option value="amman">عمّان</Combobox.Option>
          <Combobox.Option value="beirut">بيروت</Combobox.Option>
          <Combobox.Empty>لا توجد مدينة مطابقة.</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  ),
};

function InDialogExample() {
  const [fruit, setFruit] = useState('');
  return (
    <Dialog.Root>
      <Dialog.Trigger>Add to basket</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Add to basket</Dialog.Title>
        <Dialog.Description>
          The list opens in the top layer above the dialog; Esc closes the list first.
        </Dialog.Description>
        <div className="kl-example-stack">
          <FruitCombobox value={fruit} onValueChange={setFruit} />
          <p className="kl-example-output">value: {JSON.stringify(fruit)}</p>
          <Dialog.Close>Done</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export const InsideDialog: Story = {
  name: 'Inside a dialog',
  render: () => <InDialogExample />,
};

const countries = [
  'Åland Islands',
  'Algeria',
  'Angola',
  'Benin',
  'Côte d’Ivoire',
  'Curaçao',
  'Egypt',
  'Ghana',
  'Kenya',
  'Nigeria',
  'Réunion',
  'Senegal',
  'South Africa',
  'Togo',
];

function FixtureExample() {
  const [submitted, setSubmitted] = useState('nothing yet');
  const [value, setValue] = useState('');
  return (
    <form
      className="kl-example-form"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
      }}
    >
      <button type="button">Before</button>
      <Combobox.Root name="country" value={value} onValueChange={setValue}>
        <Combobox.Label>Country</Combobox.Label>
        <Combobox.Input />
        <Combobox.Trigger />
        <Combobox.Content>
          {countries.map((country) => (
            <Combobox.Option
              key={country}
              value={country.toLowerCase()}
              disabled={country === 'Egypt'}
            >
              {country}
            </Combobox.Option>
          ))}
          <Combobox.Empty>No country matches.</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
      <button type="submit">Submit</button>
      <p className="kl-example-output">
        value: {JSON.stringify(value)} · submitted: {submitted}
      </p>
    </form>
  );
}

export const KeyboardFixture: Story = {
  name: 'Keyboard test fixture',
  render: () => <FixtureExample />,
};
