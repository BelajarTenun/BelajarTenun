import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, hud } from '../lib/session.js';

const mod = JSON.parse(readFileSync(new URL('../data/tidore-dasar.json', import.meta.url)));

function setup(checkResult = { status: 'not_yet' }) {
  let t = 0;
  const events = [];
  const s = createSession(mod, {
    checkStep: async () => checkResult,
    ask: async (q) => `jawaban: ${q}`,
    log: (e) => events.push(e),
  }, () => t);
  return { s, events, tick: (ms) => { t += ms; } };
}

test('start memberi instruksi tahap pertama', () => {
  const { s } = setup();
  const r = s.start();
  assert.match(r.speak, /Mengenal alat/);
  assert.equal(r.step.index, 0);
  assert.ok(r.display.length <= 60);
});

test('ucapan "sudah" dan tombol next maju ke tahap berikutnya hingga selesai', async () => {
  const { s, events } = setup();
  s.start();
  assert.equal((await s.say('Sudah')).step.index, 1);
  for (let i = 1; i < mod.steps.length; i++) s.button('next');
  assert.equal(s.state.finished, true);
  assert.ok(events.some((e) => e.type === 'session_done'));
});

test('frame dengan status done memajukan tahap; frame dibatasi interval', async () => {
  const { s, tick } = setup({ status: 'done' });
  s.start(); s.button('next'); // tahap 2 (auto_detect)
  tick(5000);
  const r = await s.frame('img');
  assert.equal(r.step.index, 2);
  assert.equal((await s.frame('img')).skipped, true); // terlalu cepat
});

test('kesalahan menghasilkan saran perbaikan', async () => {
  const { s, tick } = setup({ status: 'mistake', fix: 'Putar pedang hingga tegak.' });
  s.start(); s.button('next'); tick(5000);
  const r = await s.frame('img');
  assert.equal(r.speak, 'Putar pedang hingga tegak.');
  assert.equal(r.step.index, 1);
});

test('pertanyaan diteruskan ke tutor', async () => {
  const { s } = setup();
  s.start();
  assert.equal((await s.say('apa fungsi sekoci?')).speak, 'jawaban: apa fungsi sekoci?');
});

test('hud memotong teks panjang', () => {
  assert.equal(hud('a'.repeat(100)).length, 60);
});
