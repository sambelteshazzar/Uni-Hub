import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, readFileSync, writeFileSync } from 'fs';

const appScripts = [
'<script type="module" src="/js/utils/icons.js?v=7"></script>',
'<script type="module" src="/js/utils/toast.js?v=8"></script>',
'<script type="module" src="/js/app-init.js?v=7"></script>',
];

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
    open: true,
  },
  css: {
    devSourcemap: true,
  },
  plugins: [
    {
      name: 'static-app-build',
      closeBundle() {
        cpSync(resolve(__dirname, 'js'), resolve(__dirname, 'dist/js'), { recursive: true });

        const htmlPath = resolve(__dirname, 'dist/index.html');
        let html = readFileSync(htmlPath, 'utf-8');

        const viteBundleMatch = html.match(/<script[^>]*src="\/assets\/main-[^"]*\.js"[^>]*><\/script>/);
        if (viteBundleMatch) {
          html = html.replace(viteBundleMatch[0], '');
        }

        if (!html.includes('/js/app-init.js')) {
          html = html.replace('</body>', appScripts.join('\n') + '\n</body>');
        }

        writeFileSync(htmlPath, html);
      },
    },
  ],
});
