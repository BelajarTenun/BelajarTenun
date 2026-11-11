import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, hud } from '../lib/session.js';
import { decide, POLICY } from '../lib/policy.js';

const mod = JSON.parse(readFileSync(new URL('../data/modules/tidore-dasar.json', import.meta.url)));

function setup(results = [{ status: 'not_yet' }], opts) {
  let t = 0, i = 0;
  const events = [], calls = [];
  const s = createSession(mod, {
    checkStep: async (step, frames, o) => { calls.push({ step: step.id, frames: frames.length, history: o.history.length }); return results[Math.min(i++, results.length - 1)]; },
    ask: async (q) => ({ answer: `jawaban: ${q}`, sources: ['x'] }),
    log: (e) => events.push(e),
  }, () => t, opts);
  return { s, events, calls, tick: (ms) => { t += ms; } };
}

test('start memberi instruksi tahap pertama', () => {
  const { s } = setup();
  const r = s.start();
  assert.match(r.speak, /Mengenal alat/);
  assert.equal(r.step.index, 0);
  assert.ok(r.display.length <= 60);
});

test('ucapan "sudah" dan tombol next maju hingga selesai', async () => {
  const { s, events } = setup();
  s.start();
  assert.equal((await s.say('Sudah')).step.index, 1);
  for (let i = 1; i < mod.steps.length; i++) s.button('next');
  assert.equal(s.state.finished, true);
  assert.ok(events.some((e) => e.type === 'session_done'));
});

test('smoothing: "selesai" butuh 2 deteksi berturut-turut; frame dibatasi interval', async () => {
  const { s, tick } = setup([{ status: 'done', confidence: 0.9 }]);
  s.start(); s.button('next'); // tahap 2 (auto_detect)
  tick(5000);
  assert.equal((await s.frame('a')).step.index, 1, 'satu deteksi belum cukup');
  assert.equal((await s.frame('b')).skipped, true, 'terlalu cepat');
  tick(5000);
  assert.equal((await s.frame('c')).step.index, 2, 'deteksi kedua → maju');
});

test('multi-frame + riwayat dikirim ke deteksi; frame buruk dibuang', async () => {
  const { s, calls, tick } = setup([{ status: 'not_yet' }]);
  s.start(); s.button('next');
  assert.equal((await s.frame('x', { quality: { ok: false } })).reason, 'kualitas');
  for (const f of ['a', 'b', 'c', 'd']) { tick(5000); await s.frame(f); }
  assert.equal(calls.at(-1).frames, 3, 'maks 3 frame terakhir');
  assert.ok(calls.at(-1).history >= 3);
});

test('frame dibekukan (pin) tidak diganti frame baru', async () => {
  const { s, calls, tick } = setup();
  s.start(); s.button('next');
  tick(5000); await s.frame('a');
  s.button('pin');
  tick(5000); await s.frame('b');
  assert.equal(calls.at(-1).frames, 1);
});

test('kesalahan menghasilkan koreksi, tidak diulang terlalu cepat', async () => {
  const { s, tick } = setup([{ status: 'mistake', fix: 'Putar pedang hingga tegak.', confidence: 0.9 }]);
  s.start(); s.button('next'); tick(15000);
  const r = await s.frame('img');
  assert.equal(r.speak, 'Putar pedang hingga tegak.');
  assert.equal(r.intent, 'koreksi');
  tick(5000);
  assert.equal((await s.frame('img')).speak ?? '', '');
});

test('petunjuk proaktif saat tidak ada kemajuan', () => {
  const { s, tick } = setup();
  s.start();
  tick(POLICY.hintAfterMs + 1000);
  const r = s.tick();
  assert.equal(r.intent, 'petunjuk');
  assert.match(r.speak, /Petunjuk/);
});

test('pertanyaan diteruskan ke tutor beserta sumber', async () => {
  const { s } = setup();
  s.start();
  const r = await s.say('apa fungsi sekoci?');
  assert.equal(r.speak, 'jawaban: apa fungsi sekoci?');
  assert.deepEqual(r.sources, ['x']);
});

test('tool Live: mark_step_done ditolak tanpa konfirmasi, diterima dengan konfirmasi', async () => {
  const { s } = setup();
  s.start();
  assert.equal((await s.tool('mark_step_done', {})).response.ditolak, true);
  const ok = await s.tool('mark_step_done', { user_confirmed: true });
  assert.equal(ok.response.berhasil, true);
  assert.equal(s.state.index, 1);
});

test('tool Live: check_my_work memakai frame terakhir & smoothing', async () => {
  const { s, tick } = setup([{ status: 'done', confidence: 0.95 }]);
  s.start(); s.button('next');
  tick(1000); await s.frame('a', {}, 1e9); // simpan frame tanpa memicu cek
  assert.equal((await s.tool('check_my_work')).response.hasil, 'done');
  const r = await s.tool('check_my_work');
  assert.equal(r.response.hasil, 'selesai');
  assert.equal(s.state.index, 2);
});

test('tool Live: kartu, catatan, laporan kesalahan', async () => {
  const { s } = setup();
  s.start(); s.button('next');
  const card = await s.tool('show_card', { uuid: 'r', type: 'list', items: [{ title: 'a' }], fallback_text: 'ringkasan' });
  assert.equal(card.ui.card.uuid, 'r');
  await s.tool('save_note', { text: 'pakan jangan kencang' });
  assert.deepEqual((await s.tool('recall_notes')).response.catatan, ['pakan jangan kencang']);
  assert.match((await s.tool('report_mistake', { mistake_index: 1 })).response.perbaikan, /pedang/);
  assert.ok((await s.tool('tidak_ada')).response.error);
});

test('policy: diam saat baru saja bicara; tawarkan bantuan setelah maks petunjuk', () => {
  const step = mod.steps[1];
  assert.equal(decide({ lastProgressAt: 0, lastSpokeAt: 999990, hintsGiven: 0 }, { type: 'tick' }, step, 1e6).talk, false);
  const r = decide({ lastProgressAt: 0, lastSpokeAt: 0, hintsGiven: POLICY.maxHints }, { type: 'tick' }, step, 1e7);
  assert.equal(r.intent, 'tawar_bantuan');
});

test('hud memotong teks panjang', () => {
  assert.equal(hud('a'.repeat(100)).length, 60);
});

test('prediksi model lokal yang yakin dipakai tanpa memanggil AI cloud', async () => {
  const { s, calls, tick } = setup([{ status: 'not_yet' }]);
  s.start(); s.button('next');
  const local = { stepId: 'buka-mulut-lungsi', label: 'done', confidence: 0.97 };
  tick(5000); await s.frame('a', { local });
  tick(5000); const r = await s.frame('b', { local });
  assert.equal(calls.length, 0);
  assert.equal(r.step.index, 2);
});
