import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { transformSync } from 'esbuild';

const appScripts = [
  '<script type="module" src="/js/app-init.js?v=7"></script>',
];

function transpileDir(dir, outDir) {
  mkdirSync(outDir, { recursive: true });
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const src = resolve(dir, entry.name);
    const dst = resolve(outDir, entry.name);
    if (entry.isDirectory()) {
      transpileDir(src, dst);
    } else if (entry.name.endsWith('.js')) {
      const { code } = transformSync(readFileSync(src, 'utf-8'), {
        target: ['chrome80', 'safari13', 'firefox72'],
        format: 'esm',
      });
      writeFileSync(dst, code);
    } else {
      cpSync(src, dst);
    }
  }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2020', 'chrome80', 'safari13', 'firefox72'],
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
      transpileDir(resolve(__dirname, 'js'), resolve(__dirname, 'dist/js'));
      cpSync(resolve(__dirname, 'css'), resolve(__dirname, 'dist/css'), { recursive: true });

      const htmlPath = resolve(__dirname, 'dist/index.html');
      let html = readFileSync(htmlPath, 'utf-8');
      const srcHtml = readFileSync(resolve(__dirname, 'index.html'), 'utf-8');

      const viteBundleMatch = html.match(/<script[^>]*src="\/assets\/main-[^"]*\.js"[^>]*><\/script>/);
      if (viteBundleMatch) {
        html = html.replace(viteBundleMatch[0], '');
      }

      const cssLinks = srcHtml.match(/<link[^>]*href="css\/[^"]*"[^>]*\/?>/g);
      if (cssLinks && !html.includes('css/variables.css')) {
        html = html.replace('</head>', cssLinks.join('\n') + '\n</head>');
      }

      if (!html.includes('/js/app-init.js')) {
        html = html.replace('</body>', appScripts.join('\n') + '\n</body>');
      }

      writeFileSync(htmlPath, html);
      },
    },
  ],
});
