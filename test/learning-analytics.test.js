import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attempts, stepDifficulty, bktUpdate, bktTrace, masteryByLearner } from '../lib/learning-analytics.js';

let t = 0;
const at = () => new Date(Date.UTC(2026, 10, 20, 10, 0, t++)).toISOString();
const ev = (sessionId, userId, step, type, extra = {}) => ({ sessionId, userId, module: 'm', step, type, at: at(), ...extra });

function sesi(id, user, { rapatBenar }) {
  return [
    ev(id, user, 'buka', 'step_start'), ev(id, user, 'buka', 'step_done', { source: 'vision' }),
    ev(id, user, 'rapat', 'step_start'),
    ...(rapatBenar ? [] : [ev(id, user, 'rapat', 'tutor_talk', { intent: 'koreksi' }), ev(id, user, 'rapat', 'tutor_talk', { intent: 'petunjuk' })]),
    ev(id, user, 'rapat', 'step_done', { source: 'voice' }),
  ];
}

test('percobaan: benar bila selesai tanpa koreksi dan ≤1 petunjuk', () => {
  const a = attempts(sesi('s1', 'u1', { rapatBenar: false }));
  assert.equal(a.find((x) => x.step === 'buka').correct, true);
  const r = a.find((x) => x.step === 'rapat');
  assert.equal(r.correct, false);
  assert.equal(r.hints, 2);
  assert.equal(r.mistakes, 1);
});

test('tahap tersulit di urutan teratas, dengan saran revisi bila data cukup', () => {
  const events = Array.from({ length: 6 }, (_, i) => sesi(`s${i}`, `u${i}`, { rapatBenar: i === 0 })).flat();
  const rows = stepDifficulty(events, { id: 'm', steps: [{ id: 'buka', title: 'Buka celah' }, { id: 'rapat', title: 'Rapatkan pakan' }] });
  assert.equal(rows[0].step, 'rapat');
  assert.equal(rows[0].title, 'Rapatkan pakan');
  assert.ok(rows[0].advice.some((x) => /latihan bagian/.test(x)));
  assert.equal(rows[1].firstTry, 1);
});

test('BKT: benar menaikkan, salah menurunkan; tiga kali benar beruntun mendekati kuasai', () => {
  assert.ok(bktUpdate(0.5, true) > 0.5);
  assert.ok(bktUpdate(0.5, false) < 0.5);
  const r = bktTrace([true, true, true, true]);
  assert.ok(r.mastery > 0.9, String(r.mastery));
  assert.equal(bktTrace([false, false]).mastered, false);
});

test('penguasaan per murid per tahap', () => {
  const events = [...sesi('a', 'u1', { rapatBenar: false }), ...sesi('b', 'u1', { rapatBenar: true }), ...sesi('c', 'u1', { rapatBenar: true })];
  const m = masteryByLearner(events);
  const rapat = m.find((x) => x.step === 'rapat');
  assert.equal(rapat.attempts, 3);
  assert.ok(rapat.trace[0] < rapat.trace[2], 'penguasaan naik setelah berhasil');
});

test('4C/ID: latihan bagian diurai & divalidasi; tutor menerima latihan + info pendukung; latihan tercatat', async () => {
  const { parsePractice, formatPractice, validateModule } = await import('../lib/core.js');
  const { createSession } = await import('../lib/session.js');
  const p = parsePractice('Hentak rata | Hentakkan belida 10 kali dengan bunyi sama | 10 | ritme\nLempar sekoci | Lewatkan sekoci kiri-kanan | x | ngawur');
  assert.deepEqual(p[0], { name: 'Hentak rata', instruction: 'Hentakkan belida 10 kali dengan bunyi sama', reps: 10, measure: 'ritme' });
  assert.equal(p[1].reps, 5); assert.equal(p[1].measure, 'hitungan');
  assert.equal(parsePractice(formatPractice(p))[0].name, 'Hentak rata');
  const step = { id: 'rapat', title: 'Rapatkan', instruction: 'x', success_criteria: 'y', common_mistakes: [{ mistake: 'miring', fix: 'hentak ulang' }], practice: p, supportive: ['kenapa-celah'] };
  const mod = { id: 'm', title: 'M', taskClass: 1, steps: [step] };
  assert.deepEqual(validateModule(mod), []);
  assert.ok(validateModule({ ...mod, taskClass: 0 }).length);
  assert.ok(validateModule({ ...mod, steps: [{ ...step, practice: [{ name: 'a', instruction: 'b', reps: 3, measure: 'aneh' }] }] }).length);
  const logs = [];
  const s = createSession(mod, { checkStep: async () => ({ status: 'uncertain' }), ask: async () => ({}), log: (e) => logs.push(e), supportive: (ids) => ids.map((id) => ({ topik: id })) });
  s.start();
  await s.tool('report_mistake', { mistake_index: 1 }); await s.tool('report_mistake', { mistake_index: 1 });
  const cur = (await s.tool('get_current_step', {})).response;
  assert.equal(cur.latihan_bagian.length, 2);
  assert.deepEqual(cur.informasi_pendukung, [{ topik: 'kenapa-celah' }]);
  assert.equal(cur.gagal_di_tahap_ini, 2);
  await s.tool('practice_done', { name: 'Hentak rata', reps_done: 10 });
  assert.ok(logs.some((e) => e.type === 'practice' && e.repsDone === 10 && e.target === 10));
  assert.equal((await s.tool('get_current_step', {})).response.gagal_di_tahap_ini, 0);
});
