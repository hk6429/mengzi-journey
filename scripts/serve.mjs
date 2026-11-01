import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../public');
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('npm run dev -- [--port 8798]\n只提供 public/；監聽 127.0.0.1。修改後先 npm run build。'); process.exit(0); }
const i = args.indexOf('--port');
const port = i >= 0 ? Number(args[i + 1]) : 8798;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('請提供有效的 --port。');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !fs.realpathSync(file).startsWith(root + path.sep)) { res.writeHead(404); res.end('找不到頁面'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end('無效的網址'); }
});
server.on('error', e => { console.error('本機預覽無法啟動：', e.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`陋室銘・仙鶴遊：http://127.0.0.1:${port}/ （僅本機；Ctrl+C 停止）`));
