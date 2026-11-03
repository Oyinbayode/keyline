import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { useSyncExternalStore } from 'react';
import { addons } from 'storybook/preview-api';

export type DocsTheme = 'dark' | 'light';
type ThemeGlobal = DocsTheme | 'system';

/*
 * The Theme toolbar global, mirrored outside React. Docs pages are not
 * stories, so they cannot use decorators or useGlobals; a channel listener
 * registered when the preview loads sees every value, including the first.
 */
let themeGlobal: ThemeGlobal = 'dark';
const listeners = new Set<() => void>();
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

function readThemeGlobal(payload: unknown): ThemeGlobal | undefined {
  if (typeof payload !== 'object' || payload === null || !('globals' in payload)) return;
  const { globals } = payload;
  if (typeof globals !== 'object' || globals === null || !('theme' in globals)) return;
  const { theme } = globals;
  return theme === 'dark' || theme === 'light' || theme === 'system' ? theme : undefined;
}

export function getDocsTheme(): DocsTheme {
  if (themeGlobal !== 'system') return themeGlobal;
  return prefersLight.matches ? 'light' : 'dark';
}

function applyTheme() {
  // On <html>, so the page background and every token below it follow the toolbar.
  if (themeGlobal === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = themeGlobal;
  for (const listener of listeners) listener();
}

function onGlobals(payload: unknown) {
  const next = readThemeGlobal(payload);
  if (!next || next === themeGlobal) return;
  themeGlobal = next;
  applyTheme();
}

const channel = addons.getChannel();
channel.on(SET_GLOBALS, onGlobals);
channel.on(GLOBALS_UPDATED, onGlobals);
prefersLight.addEventListener('change', applyTheme);
applyTheme();

export function subscribeToDocsTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDocsTheme(): DocsTheme {
  return useSyncExternalStore(subscribeToDocsTheme, getDocsTheme);
}
