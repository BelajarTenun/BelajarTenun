import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSession, gate } from '../lib/sim-score.js';

const at = (s) => new Date(Date.UTC(2026, 10, 20, 10, 0, 0) + s * 1000).toISOString();
const truth = { offset: 0, steps: [{ end: 20 }, { end: 50 }, { end: 90 }] };

test('simulasi: tepat waktu, terlalu cepat, terlewat, dan maju tanpa cek kamera', () => {
  const events = [
    { type: 'session_start', at: at(0) },
    { type: 'tool', name: 'check_my_work', at: at(18) },
    { type: 'step_done', source: 'vision', at: at(21) },       // tepat (+1)
    { type: 'tutor_talk', at: at(25) },
    { type: 'step_done', source: 'vision', at: at(30) },       // terlalu cepat (-20) dan tanpa check_my_work
    { type: 'tutor_talk', at: at(60) },
  ];
  const r = scoreSession(events, truth);
  assert.deepEqual(r.steps.map((s) => s.verdict), ['on_time', 'premature', 'missed']);
  assert.equal(r.unverifiedVisionAdvance, 1);
  assert.equal(r.steps[0].verifiedByCheck, true);
  assert.ok(Math.abs(r.premature - 1 / 3) < 1e-9);
  assert.equal(gate([r]).pass, false);
});

test('simulasi: sesi lanjutan dimulai dari tahap startIndex', () => {
  const r = scoreSession([{ type: 'session_start', startIndex: 2, at: at(0) }, { type: 'step_done', source: 'voice', at: at(92) }], truth);
  assert.equal(r.steps.length, 1);
  assert.equal(r.steps[0].verdict, 'on_time');
  assert.equal(gate([r]).pass, true);
});
