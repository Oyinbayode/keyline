import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const entries = {
  index: 'src/index.ts',
  switch: 'src/components/switch/index.ts',
  tabs: 'src/components/tabs/index.ts',
  primitives: 'src/primitives/index.ts',
};

export default defineConfig({
  plugins: [
    react(),
    // One bundled declaration file per entry, in both module flavours, so
    // `require('@oyinbayode/keyline')` gets real CJS types instead of ESM types in disguise.
    dts({
      tsconfigPath: './tsconfig.build.json',
      bundleTypes: true,
      outDirs: [
        { dir: 'dist', moduleFormat: 'esm' },
        { dir: 'dist', moduleFormat: 'cjs' },
      ],
    }),
  ],
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/],
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});
