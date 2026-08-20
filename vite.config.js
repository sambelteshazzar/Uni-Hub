import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { buildSync } from 'esbuild';

const appScripts = ['<script type="module" src="/js/app-init.js?v=17"></script>'];

// The deployed artifact is dist/ served statically — the browser loads
// dist/js/app-init.js directly and resolves each ES module as-is (no
// bundler at runtime). So the build must copy the js/ tree verbatim.
// The one exception is js/utils/sentry.js, whose bare-specifier import
// of "@sentry/browser" cannot be resolved by a browser from a static
// server — esbuild bundles that single file so the SDK is inlined.
function copyJsTree (dir, outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const src = resolve(dir, entry.name);
    const dst = resolve(outDir, entry.name);
    if (entry.isDirectory()) {
      copyJsTree(src, dst);
    } else if (entry.name === 'sentry.js') {
      buildSync({
        entryPoints: [src],
        bundle: true,
        format: 'esm',
        // Single target string: esbuild errors on the multi-target array
        // form for this bundle ("Transforming destructuring ... not
        // supported yet"), so target es2020 which is the union of the
        // Vite targets (chrome80/safari13/firefox72 are all es2020-cabable).
        target: 'es2020',
        outfile: dst,
        logLevel: 'warning',
      });
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
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 50,
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
      closeBundle () {
        cpSync(resolve(__dirname, 'css'), resolve(__dirname, 'dist/css'), { recursive: true });

        const componentsSrc = resolve(__dirname, 'public/components');
        if (existsSync(componentsSrc)) {
          cpSync(componentsSrc, resolve(__dirname, 'dist/components'), { recursive: true });
        }

        const pagesSrc = resolve(__dirname, 'public/pages');
        if (existsSync(pagesSrc)) {
          cpSync(pagesSrc, resolve(__dirname, 'dist/pages'), { recursive: true });
        }

        copyJsTree(resolve(__dirname, 'js'), resolve(__dirname, 'dist/js'));

        const srcHtmlPath = resolve(__dirname, 'index.html');
        const htmlPath = resolve(__dirname, 'dist/index.html');
        if (!existsSync(htmlPath)) {
          cpSync(srcHtmlPath, htmlPath);
        }

        let html = readFileSync(htmlPath, 'utf-8');
        const srcHtml = readFileSync(srcHtmlPath, 'utf-8');

        const viteBundleMatch = html.match(
          /<script[^>]*src="\/assets\/[^"]*\.js"[^>]*><\/script>/,
        );
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
