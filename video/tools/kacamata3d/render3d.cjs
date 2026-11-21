// node render3d.cjs <page.html> <shot> <detik> <folderKeluar> [stillT1,stillT2]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const [page, shot, secs, outDir, stills, extra = ''] = process.argv.slice(2); const dir = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const port = 8800 + Math.floor(Math.random() * 100);
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(port);
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', (e) => console.log('err:', e.message));
  const ts = stills && stills !== '-' ? stills.split(',').map(Number) : Array.from({ length: Math.round(+secs * 30) }, (_, i) => i / 30);
  const anchors = [];
  for (let i = 0; i < ts.length; i++) {
    await pg.goto(`http://localhost:${port}/${page}?shot=${shot}&t=${ts[i].toFixed(4)}${extra}`);
    await pg.waitForFunction(() => document.title === 'done', null, { timeout: 60000 });
    anchors.push(await pg.evaluate(() => window.__anchors || {}));
    await pg.screenshot({ path: path.join(outDir, `${String(i).padStart(4, '0')}.png`), omitBackground: true });
    if (i % 30 === 0) console.log(shot, i, '/', ts.length);
  }
  fs.writeFileSync(path.join(outDir, 'anchors.json'), JSON.stringify(anchors));
  await b.close(); srv.close();
})();
