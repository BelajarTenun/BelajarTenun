const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const dir = __dirname;
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': path.extname(p) === '.html' ? 'text/html' : 'image/png' }); fs.createReadStream(p).pipe(r); }).listen(8878);
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 2400, height: 1000 } });
  for (const s of ['starting', 'proses', 'tracker']) { await pg.goto(`http://localhost:8878/board.html?s=${s}`); await pg.waitForFunction(() => document.title === 'done'); await pg.waitForTimeout(800); await pg.locator('#b').screenshot({ path: `prototipe-${s}.png` }); }
  await b.close(); srv.close(); })();
