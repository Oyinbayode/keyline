import { create } from 'storybook/theming/create';

const systemFont =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, Cantarell, sans-serif";
const monoFont = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export const keylineTheme = create({
  base: 'dark',
  brandTitle: 'Keyline',
  brandUrl: 'https://github.com/Oyinbayode/keyline',
  brandTarget: '_blank',

  colorPrimary: '#5b8dff',
  colorSecondary: '#5b8dff',

  appBg: '#04060a',
  appContentBg: '#04060a',
  appPreviewBg: '#04060a',
  appBorderColor: '#232d3d',
  appBorderRadius: 6,

  fontBase: systemFont,
  fontCode: monoFont,

  textColor: '#e6ecf5',
  textMutedColor: '#8796ad',
  textInverseColor: '#04060a',

  barBg: '#0a0f17',
  barTextColor: '#8796ad',
  barSelectedColor: '#5b8dff',
  barHoverColor: '#e6ecf5',

  inputBg: '#04060a',
  inputBorder: '#232d3d',
  inputTextColor: '#e6ecf5',
  inputBorderRadius: 4,
});
