import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { homePlugin } from './src/site/homepage/plugin.mjs';
import { sheetPlugin } from './src/site/sheet/plugin.mjs';

/** Multi-page site under the Pages base; the homepage is rendered by its plugin, unit pages are framed as sheets; the vendored kits resolve through two aliases. */
const root = import.meta.dirname;
const kit = (p: string): string => resolve(root, 'src/kit/explainer', p);
export default defineConfig({
  base: process.env.BASE ?? '/ailearning/',
  plugins: [homePlugin(), sheetPlugin()],
  resolve: {
    alias: [
      { find: /^explainer-kit$/, replacement: kit('src/index.ts') },
      { find: /^explainer-kit\/cutaway$/, replacement: kit('adapters/cutaway/index.ts') },
    ],
    dedupe: ['gsap', 'three'],
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { home: resolve(root, 'index.html'), 'not-found': resolve(root, '404.html'), 'u-01-neuron': resolve(root, 'u/01-neuron/index.html') } },
  },
});
