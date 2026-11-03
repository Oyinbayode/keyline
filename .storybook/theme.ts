import { create } from 'storybook/theming/create';

/*
 * Storybook's theme API takes plain values, not CSS variables, so the scale
 * steps are repeated here. Keep them in step with src/styles/tokens.css.
 */
const sans = "'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const shared = {
  brandTitle: 'Keyline',
  brandUrl: 'https://github.com/Oyinbayode/keyline',
  brandTarget: '_blank',
  // Rules, not rounded cards: squares off Storybook's panels, previews and tables.
  appBorderRadius: 0,
  inputBorderRadius: 4,
  fontBase: sans,
  fontCode: mono,
} as const;

export const keylineDark = create({
  ...shared,
  base: 'dark',
  colorPrimary: '#5b8dff',
  colorSecondary: '#5b8dff',

  appBg: '#0a0f17',
  appContentBg: '#04060a',
  appPreviewBg: '#04060a',
  appBorderColor: '#232d3d',

  textColor: '#e6ecf5',
  textMutedColor: '#9aa8bf',
  textInverseColor: '#04060a',

  barBg: '#0a0f17',
  barTextColor: '#9aa8bf',
  barSelectedColor: '#5b8dff',
  barHoverColor: '#e6ecf5',

  buttonBg: '#111826',
  buttonBorder: '#232d3d',
  booleanBg: '#111826',
  booleanSelectedBg: '#1d2840',

  inputBg: '#04060a',
  inputBorder: '#50607b',
  inputTextColor: '#e6ecf5',
});

export const keylineLight = create({
  ...shared,
  base: 'light',
  colorPrimary: '#1f56e0',
  colorSecondary: '#1f56e0',

  appBg: '#f4f6fa',
  appContentBg: '#fbfcfe',
  appPreviewBg: '#fbfcfe',
  appBorderColor: '#c9d3e1',

  textColor: '#0a0f18',
  textMutedColor: '#4a5873',
  textInverseColor: '#fbfcfe',

  barBg: '#f4f6fa',
  barTextColor: '#4a5873',
  barSelectedColor: '#1f56e0',
  barHoverColor: '#0a0f18',

  buttonBg: '#eef2f7',
  buttonBorder: '#c9d3e1',
  booleanBg: '#eef2f7',
  booleanSelectedBg: '#fbfcfe',

  inputBg: '#fbfcfe',
  inputBorder: '#7e8fab',
  inputTextColor: '#0a0f18',
});
