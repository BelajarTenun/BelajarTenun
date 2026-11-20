const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const dir = process.argv[2], views = process.argv.slice(3);
(async()=>{
const types = { '.html': 'text/html', '.js': 'text/javascript', '.stl': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(8765);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('err:', e.message));
const list = views[0]==='orbit' ? Array.from({length:150},(_,i)=>'orbit&t='+(i/149).toFixed(4)) : views; let k=0;
  for (const v of list) {
  await pg.goto(`http://localhost:8765/scene.html?view=${v}`);
  await pg.waitForFunction(() => document.title === 'done', null, { timeout: 60000 });
  await pg.screenshot({ path: path.join(dir, views[0]==='orbit' ? `../g3d-orbit/${String(k++).padStart(4,'0')}.png` : `../g3d-${v}.png`) }); 
}
await b.close(); srv.close();
})();
