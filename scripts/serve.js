import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const requestedRoot = process.argv[2] || '.';
const root = resolve(projectRoot, requestedRoot);
const port = Number(process.argv[3] || process.env.PORT || 5173);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = resolve(root, relative);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    let pathToRead = filePath;
    try { if ((await stat(pathToRead)).isDirectory()) pathToRead = join(pathToRead, 'index.html'); }
    catch { /* Return 404 below. */ }
    const data = await readFile(pathToRead);
    response.writeHead(200, {
      'Content-Type': mime[extname(pathToRead)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`Piecelight is available at http://localhost:${port}`);
  if (requestedRoot === 'dist') console.log('Serving the production build.');
});
