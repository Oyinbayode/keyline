import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/styles/index.css';
import './docs.css';
import { keylineTheme } from './theme';

const withThemeAndDirection: Decorator = (Story, context) => {
  const theme: unknown = context.globals.theme;
  const direction: unknown = context.globals.direction;
  return (
    <div
      className="kl-story-canvas"
      data-theme={theme === 'light' || theme === 'dark' ? theme : undefined}
      dir={direction === 'rtl' ? 'rtl' : 'ltr'}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withThemeAndDirection],
  globalTypes: {
    theme: {
      description: 'Keyline colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'system', title: 'System preference' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      description: 'Writing direction',
      toolbar: {
        title: 'Direction',
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'Left to right' },
          { value: 'rtl', title: 'Right to left' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark', direction: 'ltr' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    docs: { theme: keylineTheme },
    a11y: { test: 'error' },
    options: {
      storySort: { order: ['Introduction', 'Tokens', 'Components'] },
    },
  },
};

export default preview;
