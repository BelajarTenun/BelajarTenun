import { test } from 'node:test';
import assert from 'node:assert/strict';
import { myMastery, sessionDetail, masteryState } from '../lib/learner.js';

const mod = { id: 'm', steps: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }] };
let t = 0;
const ev = (sid, step, type, x = {}) => ({ sessionId: sid, userId: 'u1', module: 'm', step, type, at: new Date(Date.UTC(2026, 10, 20, 10, t++)).toISOString(), ...x });

test('penguasaan murid: tiga status, hanya data murid itu', () => {
  const events = [];
  for (const s of ['s1', 's2', 's3', 's4']) events.push(ev(s, 'a', 'step_start'), ev(s, 'a', 'step_done'));
  events.push(ev('s1', 'b', 'step_start'), ev('s1', 'b', 'tutor_talk', { intent: 'koreksi' }), ev('s1', 'b', 'step_done'));
  events.push({ ...ev('x', 'c', 'step_done'), userId: 'lain' });
  const m = myMastery(events, 'u1', [mod]).m;
  assert.equal(m.a.state, 'dikuasai'); assert.equal(m.b.state, 'dilatih'); assert.equal(m.c.state, 'belum');
  assert.equal(masteryState(null), 'belum');
});

test('detail sesi: tahap, koreksi, catatan, pertanyaan, tahap lanjut', () => {
  const e = [ev('s', 'a', 'session_start'), ev('s', 'a', 'step_done', { source: 'voice' }), ev('s', 'b', 'tutor_talk', { intent: 'koreksi' }),
    ev('s', 'b', 'check', { status: 'mistake' }), ev('s', 'b', 'note', { text: 'catat' }), ev('s', 'b', 'question', { question: 'kenapa?' }),
    ev('s', 'b', 'practice', { name: 'Hentak', repsDone: 8, target: 10 }), ev('s', 'b', 'pattern_row', { row: 3 })];
  const d = sessionDetail(e, mod);
  assert.equal(d.steps.find((s) => s.id === 'a').done, true);
  assert.equal(d.steps.find((s) => s.id === 'b').corrections, 2);
  assert.equal(d.steps.find((s) => s.id === 'b').patternRows, 3);
  assert.deepEqual(d.notes, ['catat']); assert.deepEqual(d.questions, ['kenapa?']);
  assert.equal(d.practice[0].target, 10);
  assert.equal(d.resumeIndex, 1);
});
