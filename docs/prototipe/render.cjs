const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const jobs = JSON.parse(process.argv[2]); const dir = __dirname;
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(8877);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1200, height: 2000 } }); pg.on('pageerror', (e) => console.log('err', e.message));
  for (const [img, ry, rx, rz, out] of jobs) { await pg.goto(`http://localhost:8877/phone.html?img=${img}&ry=${ry}&rx=${rx}&rz=${rz}`); await pg.waitForFunction(() => document.title === 'done', null, { timeout: 120000 }); await pg.screenshot({ path: out, omitBackground: true }); console.log('ok', out); }
  await b.close(); srv.close();
})();
