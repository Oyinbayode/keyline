import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';
import type { PluginOption } from 'vite';

// The library build's declaration bundler is slow and pointless for the docs site.
function isDeclarationPlugin(plugin: PluginOption): boolean {
  return Boolean(plugin && 'name' in plugin && plugin.name.includes('dts'));
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../docs/**/*.mdx', '../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: [
    {
      name: '@storybook/addon-docs',
      // Keyboard and test-matrix tables are written in GitHub-flavoured Markdown.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
  ],
  // Docs-only web fonts, served from the site itself: no request to Google Fonts.
  staticDirs: ['./public'],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: viteConfig.plugins?.flat().filter((plugin) => !isDeclarationPlugin(plugin)),
    // GitHub Pages serves the site from /keyline/, so asset URLs must be relative.
    base: './',
  }),
};

export default config;
