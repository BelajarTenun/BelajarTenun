// Tes integrasi: server sungguhan di port acak, data di folder sementara, tanpa API key.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bt-test-'));
process.env.DATA_DIR = dir;
process.env.GEMINI_API_KEY = '';
process.env.AUTH_SECRET = 'rahasia-tes';
process.env.PASSWORD_LOGIN = '1';
process.env.AGENT_TOKEN = 'rahasia-agen-untuk-tes-integrasi';
const { server } = await import('../server.js');
const { seedDataDir } = await import('../lib/store.js');
let base;

before(async () => { await seedDataDir(); await new Promise((r) => server.listen(0, r)); base = `http://localhost:${server.address().port}`; });
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

const jar = {};
async function call(path, body, who) {
  const res = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(who && jar[who] ? { cookie: jar[who] } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const c = res.headers.get('set-cookie'); if (c && who) jar[who] = c.split(';')[0];
  return { status: res.status, body: await res.json().catch(() => null) };
}

test('alur akun: admin pertama, partner menunggu persetujuan, kode akses kacamata', async () => {
  const a = await call('/api/auth/register', { name: 'Admin', email: 'admin@x.id', password: 'rahasia123' }, 'admin');
  assert.equal(a.body.role, 'admin');
  const p = await call('/api/auth/register', { name: 'Ibu Penenun', email: 'p@x.id', password: 'rahasia123', role: 'partner' }, 'partner');
  assert.equal(p.body.status, 'pending');
  assert.equal((await call('/api/auth/login', { email: 'p@x.id', password: 'rahasia123' }, 'partner')).status, 403);
  assert.equal((await call('/api/recordings', undefined, 'partner')).status, 401);
  const users = (await call('/api/admin/users', undefined, 'admin')).body.users;
  await call('/api/admin/users', { id: users.find((u) => u.email === 'p@x.id').id, status: 'approved' }, 'admin');
  assert.equal((await call('/api/auth/login', { email: 'p@x.id', password: 'rahasia123' }, 'partner')).status, 200);
  assert.equal((await call('/api/recordings', undefined, 'partner')).status, 200);
  assert.equal((await call('/api/admin/users', undefined, 'partner')).status, 403);

  const { token } = (await call('/api/auth/device-tokens', { label: 'Frame' }, 'partner')).body;
  const me = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
  assert.equal(me.user.email, 'p@x.id');
});

test('sesi lewat Glasses API + tool Live + progres', async () => {
  const s = (await call('/api/glasses/start', {})).body;
  assert.match(s.speak, /Tahap 1/);
  const q = (await call('/api/glasses/say', { sessionId: s.sessionId, text: 'apa fungsi sekoci' })).body;
  assert.match(q.speak, /Sekoci/);
  assert.ok(q.sources.includes('fungsi-sekoci'));
  const t = (await call('/api/live/tool', { sessionId: s.sessionId, name: 'mark_step_done', args: { user_confirmed: true } })).body;
  assert.equal(t.response.berhasil, true);
  assert.equal((await call('/api/live/token', { sessionId: s.sessionId })).status, 501);
  const p = (await call('/api/progress', undefined, 'admin')).body;
  assert.ok(p.totalSessions >= 1);
});

test('pertanyaan tanpa jawaban tervalidasi dicatat untuk partner', async () => {
  const r = (await call('/api/ask', { question: 'berapa harga kain songket di pasar' })).body;
  assert.equal(r.mode, 'none');
  const u = (await call('/api/knowledge/unanswered', undefined, 'admin')).body.items;
  assert.ok(u.some((x) => /songket/.test(x.question)));
});

test('dataset: persetujuan wajib, upload frame berlabel, segmen, cabut izin', async () => {
  assert.equal((await call('/api/recordings', { stepId: 'rapatkan', label: 'done', consent: { given: true } }, 'partner')).status, 400);
  const rec = (await call('/api/recordings', { stepId: 'full', consent: { given: true, name: 'Ibu A', scopes: ['pengembangan_ai'] } }, 'partner')).body;
  const up = await fetch(`${base}/api/recordings/upload?id=${rec.id}&name=seg-rapatkan-done-10.jpg&stepId=rapatkan&label=done&t=1`, { method: 'POST', headers: { cookie: jar.partner }, body: Buffer.from([0xff, 0xd8, 0xff]) });
  assert.equal(up.status, 200);
  const seg = (await call('/api/recordings/segments', { id: rec.id, segments: [{ stepId: 'rapatkan', label: 'done', start: 1, end: 4 }] }, 'partner')).body;
  assert.equal(seg.segments.length, 1);
  assert.equal((await call('/api/recordings/use-as-demo', { id: rec.id }, 'partner')).status, 400, 'izin pembelajaran tidak diberikan');
  // Pemula tidak bisa melihat rekaman tanpa izin pembelajaran
  assert.equal((await fetch(`${base}/recordings/${rec.id}/seg-rapatkan-done-10.jpg`)).status, 404);
  await call('/api/recordings/withdraw', { id: rec.id }, 'partner');
  const list = (await call('/api/recordings', undefined, 'partner')).body.recordings;
  assert.ok(!list.some((r) => r.id === rec.id));
});

test('editor menolak modul tidak valid; path traversal ditolak', async () => {
  const mod = (await call('/api/module')).body;
  mod.steps[0].id = mod.steps[1].id;
  assert.equal((await call('/api/module', mod, 'partner')).status, 400);
  assert.equal((await fetch(`${base}/api/module?id=../users`)).status, 404);
  assert.equal((await fetch(`${base}/../data/users.json`)).status, 404);
});

test('tracer membuang data gambar', async () => {
  await call('/api/trace', { events: [{ type: 'x', sessionId: 'z', image: 'A'.repeat(500), note: 'ok' }] });
  const { readFileSync } = await import('node:fs');
  const log = readFileSync(join(dir, 'logs/sessions.jsonl'), 'utf8');
  assert.ok(log.includes('"note":"ok"'));
  assert.ok(!log.includes('AAAAAAAAAA'));
});

test('agen LiveKit: hanya rahasia bersama yang benar boleh mengambil konfigurasi sesi', async () => {
  const s = (await call('/api/session/start', {})).body;
  const get = (token) => fetch(`${base}/api/agent/session-config?sessionId=${s.sessionId}`, { headers: token ? { 'x-agent-token': token } : {} });
  assert.equal((await get()).status, 401);
  assert.equal((await get('salah-tapi-panjangnya-sama-x')).status, 401);
  const ok = await (await get('rahasia-agen-untuk-tes-integrasi')).json();
  assert.match(ok.instructions, /tutor menenun/);
  assert.ok(ok.tools.some((t) => t.name === 'check_my_work' && t.parameters.type === 'object'));
  assert.equal((await call('/api/livekit/token', { sessionId: s.sessionId })).status, 501, 'LiveKit tidak dikonfigurasi di tes ini');
});

test('video pengenalan modul: hanya dari rekaman yang diizinkan untuk pembelajaran', async () => {
  const rec = (await call('/api/recordings', { stepId: 'full', consent: { given: true, name: 'Ibu B', scopes: ['pengembangan_ai'] } }, 'partner')).body;
  await fetch(`${base}/api/recordings/upload?id=${rec.id}&name=video.webm`, { method: 'POST', headers: { cookie: jar.partner }, body: Buffer.from('x') });
  assert.equal((await call('/api/module/intro-video', { moduleId: 'tidore-dasar', recordingId: rec.id }, 'partner')).status, 400);
  const ok = await call('/api/recordings', { stepId: 'full', consent: { given: true, name: 'Ibu C', scopes: ['pembelajaran'] } }, 'partner');
  await fetch(`${base}/api/recordings/upload?id=${ok.body.id}&name=video.webm`, { method: 'POST', headers: { cookie: jar.partner }, body: Buffer.from('x') });
  const r = (await call('/api/module/intro-video', { moduleId: 'tidore-dasar', recordingId: ok.body.id, start: 3, end: 40 }, 'partner')).body;
  assert.equal(r.intro.video, `recordings/${ok.body.id}/video.webm#t=3,40`);
  assert.equal(r.intro.video_attribution, 'Penenun: Ibu C');
  const mod = (await call('/api/module?id=tidore-dasar')).body;
  assert.ok(mod.intro.summary, 'ringkasan lama tetap ada');
  assert.equal((await call('/api/module/intro-video', { moduleId: 'tidore-dasar', recordingId: ok.body.id })).status, 401, 'pemula/tamu tidak boleh');
});

test('login kata sandi bisa dimatikan (bawaan produksi: hanya Google)', async () => {
  const { config } = await import('../lib/config.js');
  config.passwordLogin = false;
  try {
    assert.equal((await call('/api/auth/login', { email: 'p@x.id', password: 'rahasia123' })).status, 403);
    assert.equal((await call('/api/auth/register', { name: 'X', email: 'x@x.id', password: 'rahasia123' })).status, 403);
    assert.equal((await call('/api/config')).body.passwordLogin, false);
  } finally { config.passwordLogin = true; }
});

test('halaman Ruang tim dikunci di server, bukan hanya di browser', async () => {
  const get = (path, who) => fetch(base + path, { redirect: 'manual', headers: who && jar[who] ? { cookie: jar[who] } : {} });
  const guest = await get('/admin.html');
  assert.equal(guest.status, 302);
  assert.match(guest.headers.get('location'), /^\/masuk\?lanjut=%2Fadmin\.html$/);
  await call('/api/auth/register', { name: 'Murid', email: 'murid@x.id', password: 'rahasia123' }, 'murid');
  const pemula = await get('/editor.html', 'murid');
  assert.equal(pemula.status, 302, 'pemula tidak boleh menerima halaman editor');
  assert.equal(pemula.headers.get('location'), '/belajar', 'pemula dikembalikan ke aplikasi murid');
  assert.equal((await get('/progres.html', 'murid')).status, 302, 'progres belajar khusus tim');
  assert.equal((await get('/admin.html', 'partner')).status, 302, 'partner tidak boleh membuka admin');
  assert.equal((await get('/editor.html', 'partner')).status, 200);
  assert.equal((await get('/admin.html', 'admin')).status, 200);
  assert.equal((await get('/arsip.html')).status, 404, 'arsip publik sudah dihapus');
  assert.equal((await get('/kacamata.html')).status, 404, 'simulator lama sudah dihapus');
});

test('tujuan setelah masuk berbeda per peran', async () => {
  const { homeFor } = await import('../server.js');
  assert.equal(homeFor({ role: 'admin' }), '/admin.html');
  assert.equal(homeFor({ role: 'partner' }), '/editor.html');
  assert.equal(homeFor({ role: 'pemula' }), '/belajar');
  assert.equal(homeFor(null), '/belajar');
  assert.equal((await call('/api/config', undefined, 'admin')).body.home, '/admin.html');
  assert.equal((await call('/api/config', undefined, 'murid')).body.home, '/belajar');
});

test('cek koneksi admin: semua layanan dilaporkan, tanpa AI ditandai dilewati', async () => {
  assert.equal((await call('/api/admin/diagnostics', undefined, 'partner')).status, 403);
  const r = (await call('/api/admin/diagnostics', undefined, 'admin')).body;
  const by = Object.fromEntries(r.checks.map((c) => [c.name, c.status]));
  assert.equal(by['Penyimpanan data'], 'ok');
  assert.equal(by['AI: menjawab teks'], 'skip');
  assert.equal(by['Login Google'], 'gagal');
  assert.ok(r.checks.length >= 9);
});

test('lanjutkan sesi: mulai dari tahap tertentu dan tercatat di ringkasan progres', async () => {
  const s = (await call('/api/session/start', { startStep: 2 }, 'admin')).body;
  assert.equal(s.step.index, 2);
  assert.equal((await call('/api/session/start', { startStep: 99 }, 'admin')).body.step.index, 4, 'dibatasi ke tahap terakhir');
  const p = (await call('/api/progress?mine=1', undefined, 'admin')).body;
  const mine = p.sessions.find((x) => x.id === s.sessionId);
  assert.equal(mine.reached, 2);
  assert.equal(mine.done, false);
});

test('pasangan HP-kamera: tanpa LiveKit ditolak dengan 501', async () => {
  const r = await call('/api/pair/new', {}, 'admin');
  assert.equal(r.status, 501);
  const t = await call('/api/pair/token', { code: '123456', role: 'camera' });
  assert.equal(t.status, 501);
});

test('heartbeat agen: hanya agen yang boleh melapor, diagnostik membaca model Live', async () => {
  const agent = { 'x-agent-token': process.env.AGENT_TOKEN, 'content-type': 'application/json' };
  const models = await (await fetch(`${base}/api/agent/live-models`, { headers: agent })).json();
  assert.ok(Array.isArray(models.models) && models.models.length >= 1);
  assert.equal((await call('/api/agent/heartbeat', { ok: true, model: 'x' }, 'admin')).status, 403, 'admin biasa tidak boleh memalsukan laporan agen');
  const r = await fetch(`${base}/api/agent/heartbeat`, { method: 'POST', headers: agent, body: JSON.stringify({ ok: true, model: models.models[1] ?? models.models[0], candidates: models.models }) });
  assert.equal(r.status, 200);
});

test('simulasi: login khusus agen selalu pemula, event sesi bisa dibaca', async () => {
  const agent = { 'x-agent-token': process.env.AGENT_TOKEN, 'content-type': 'application/json' };
  assert.equal((await call('/api/admin/sim-login', {}, 'admin')).status, 403, 'admin manusia tidak bisa membuat sesi simulasi');
  const r = await fetch(`${base}/api/admin/sim-login`, { method: 'POST', headers: agent, body: '{}' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).user.role, 'pemula');
  assert.match(r.headers.get('set-cookie'), /bt_session=/);
  const ev = await fetch(`${base}/api/admin/session-events?sessionId=tidak-ada`, { headers: agent });
  assert.deepEqual((await ev.json()).events, []);
});
