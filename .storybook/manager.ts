import { addons } from 'storybook/manager-api';
import { keylineDark } from './theme';

// The manager stays dark; the Theme toolbar switches the docs and canvas only.
addons.setConfig({ theme: keylineDark });
