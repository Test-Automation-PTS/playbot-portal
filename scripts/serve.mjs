import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const base = resolve('dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let path = resolve(base, '.' + decodeURIComponent(url.pathname));
    if (path !== base && !path.startsWith(base + sep)) throw new Error('Invalid path');
    if (statSync(path).isDirectory()) path += '/index.html';
    response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    response.end(readFileSync(path));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
