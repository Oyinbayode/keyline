import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import { keylineDark, keylineLight } from './theme';

addons.setConfig({ theme: keylineDark });

const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

function readTheme(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null || !('globals' in payload)) return;
  const { globals } = payload;
  if (typeof globals !== 'object' || globals === null || !('theme' in globals)) return;
  return globals.theme;
}

/*
 * The chrome follows the same Theme toolbar as the docs, so a light page does
 * not sit beside a dark sidebar. manager-head.html keys its brand and
 * selection colours off data-kl-theme.
 */
addons.register('keyline/theme', (api) => {
  let themeGlobal: unknown = 'dark';
  const apply = () => {
    const isLight = themeGlobal === 'light' || (themeGlobal === 'system' && prefersLight.matches);
    document.documentElement.dataset.klTheme = isLight ? 'light' : 'dark';
    api.setOptions({ theme: isLight ? keylineLight : keylineDark });
  };
  const onGlobals = (payload: unknown) => {
    const next = readTheme(payload);
    if (next === undefined || next === themeGlobal) return;
    themeGlobal = next;
    apply();
  };
  api.on(SET_GLOBALS, onGlobals);
  api.on(GLOBALS_UPDATED, onGlobals);
  prefersLight.addEventListener('change', apply);
  apply();
});
