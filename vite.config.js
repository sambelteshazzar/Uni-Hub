import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { buildSync } from 'esbuild';

// Keep in sync with index.html's app-init.js?v=N tag. closeBundle strips
// Vite's transformed entry and re-injects this literal when the source
// tag isn't already in the output — a stale version here freezes clients
// on the previous module bundle for a full day (js Cache-Control max-age).
const APP_INIT_VERSION = '39';
const appScripts = [`<script type="module" src="/js/app-init.js?v=${APP_INIT_VERSION}"></script>`];

// The deployed artifact is dist/ served statically — the browser loads
// dist/js/app-init.js directly and resolves each ES module as-is (no
// bundler at runtime). So the build must copy the js/ tree verbatim.
// The one exception is js/utils/sentry.js, whose bare-specifier import
// of "@sentry/browser" cannot be resolved by a browser from a static
// server — esbuild bundles that single file so the SDK is inlined.
function copyJsTree(dir, outDir) {
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
      closeBundle() {
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

        const viteBundleMatch = html.match(/<script[^>]*src="\/assets\/[^"]*\.js"[^>]*><\/script>/);
        if (viteBundleMatch) {
          html = html.replace(viteBundleMatch[0], '');
        }

        const cssLinks = srcHtml.match(/<link[^>]*href="css\/[^"]*"[^>]*\/?>/g);
        if (cssLinks && !html.includes('css/variables.css')) {
          html = html.replace('</head>', cssLinks.join('\n') + '\n</head>');
        }

        // Always stamp the canonical app-init tag. Vite may rewrite the
        // source <script src="js/app-init.js?v=N"> into an /assets/ bundle
        // (stripped above) or leave a relative path that the browser would
        // cache under a different key. Replacing keeps one entry point and
        // one version — matching APP_INIT_VERSION + index.html + MODULE_VERSION
        // semantics (MODULE_VERSION still gates the dynamically-imported tree).
        const existingAppInit = html.match(
          /<script[^>]*src="[^"]*app-init\.js(\?[^"]*)?"[^>]*><\/script>/
        );
        if (existingAppInit) {
          html = html.replace(existingAppInit[0], appScripts[0]);
        } else {
          html = html.replace('</body>', appScripts.join('\n') + '\n</body>');
        }

        writeFileSync(htmlPath, html);
      },
    },
  ],
});
