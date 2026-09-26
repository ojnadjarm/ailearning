// Serves dist/ the way GitHub Pages does: only under BASE, /dir → 301 /dir/, dir/ → index.html, misses → 404 with 404.html,
// text types gzip-encoded when the client accepts it.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2',
  '.opus': 'audio/ogg', '.m4a': 'audio/mp4', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const TEXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml']);
const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);
const isDir = (p) => stat(p).then((s) => s.isDirectory(), () => false);

/** Starts the simulator; resolves to { url, close }. */
export async function startPagesSim({ dir = 'dist', base = process.env.BASE ?? '/ailearning/', port = 0 } = {}) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const send = async (code, file) => {
      const ext = file ? extname(file) : '.html', body = file ? await readFile(file) : Buffer.from('Not Found');
      const gz = TEXT.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      res.writeHead(code, { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'max-age=600', vary: 'accept-encoding', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
      res.end(gz ? gzipSync(body) : body);
    };
    const miss = async () => ((await isFile(join(dir, '404.html'))) ? send(404, join(dir, '404.html')) : send(404));
    if (path === base.slice(0, -1)) { res.writeHead(301, { location: base }); return res.end(); }
    if (!path.startsWith(base)) return miss();
    const file = join(dir, normalize(path.slice(base.length)).replace(/^(\.\.[/\\])+/, ''));
    if (path.endsWith('/')) return (await isFile(join(file, 'index.html'))) ? send(200, join(file, 'index.html')) : miss();
    if (await isFile(file)) return send(200, file);
    if (await isDir(file)) { res.writeHead(301, { location: path + '/' }); return res.end(); }
    return miss();
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}${base}`, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await startPagesSim({ port: Number(process.env.PORT ?? 4179) });
  console.log(`pages-sim: ${url}`);
}
