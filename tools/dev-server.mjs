#!/usr/bin/env node
// Dev static server: serves the project root with `public/` aliased to `/`.
// Mirrors what Vite's `publicDir: 'public'` does during `npm run dev` and
// what `vite build` does for the production `dist/`.
//
// Usage:  node tools/dev-server.mjs [port]   (default 8000)
//
// Why: `npx http-server .` does NOT serve files in `public/` at the root
// path (Vite does, both in dev and after build). Without this, the favicon
// and `/assets/...` product images 404 in `npm start` and the brand mark
// is broken in every page header on every viewport.

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { resolve, join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const PORT = Number(process.argv[2] || process.env.PORT || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  if (body && typeof body.pipe === 'function') body.pipe(res);
  else res.end(body);
}

function safeJoin(base, urlPath) {
  // Reject paths that escape the base.
  const target = normalize(join(base, urlPath));
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}

function tryServe(absPath, res) {
  if (!existsSync(absPath)) return false;
  const stat = statSync(absPath);
  if (!stat.isFile()) return false;
  const type = MIME[extname(absPath).toLowerCase()] || 'application/octet-stream';
  send(res, 200, createReadStream(absPath), { 'Content-Type': type, 'Content-Length': stat.size });
  return true;
}

const server = createServer((req, res) => {
  // Strip query string, decode URI, drop leading slash.
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    return send(res, 400, 'Bad URL');
  }
  if (urlPath === '/') urlPath = '/index.html';

  // 1. Try the public/ tree first (matches Vite's `publicDir: 'public'`).
  const publicPath = safeJoin(PUBLIC, urlPath);
  if (publicPath && tryServe(publicPath, res)) return;

  // 2. Fall back to the project root (so js/, css/, dist/ still work).
  const rootPath = safeJoin(ROOT, urlPath);
  if (rootPath && tryServe(rootPath, res)) return;

  send(res, 404, 'Not Found');
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`dev-server: http://localhost:${PORT}  (root=${ROOT})`);
});
