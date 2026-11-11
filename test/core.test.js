import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchKnowledge, interpretStepCheck, buildStepCheckPrompt } from '../lib/core.js';

const kb = JSON.parse(readFileSync(new URL('../data/knowledge.json', import.meta.url))).entries;
const mod = JSON.parse(readFileSync(new URL('../data/modules/tidore-dasar.json', import.meta.url)));
const step = mod.steps.find((s) => s.id === 'masukkan-pakan');

test('Q&A menemukan entri yang relevan', () => {
  assert.equal(searchKnowledge(kb, 'Kenapa tepi kainku menyempit?')[0].id, 'tepi-menyempit');
  assert.equal(searchKnowledge(kb, 'apa fungsi sekoci')[0].id, 'fungsi-sekoci');
  assert.equal(searchKnowledge(kb, 'cuaca hari ini').length, 0);
});

test('keputusan "done" dengan keyakinan rendah jadi "uncertain"', () => {
  assert.equal(interpretStepCheck('{"status":"done","confidence":0.4}', step).status, 'uncertain');
  assert.equal(interpretStepCheck('{"status":"done","confidence":0.9}', step).status, 'done');
});

test('kesalahan dipetakan ke saran perbaikan', () => {
  const r = interpretStepCheck({ status: 'mistake', mistake_index: 1, confidence: 0.8 }, step);
  assert.equal(r.fix, step.common_mistakes[0].fix);
  assert.equal(interpretStepCheck({ status: 'mistake', mistake_index: 9, confidence: 0.9 }, step).status, 'uncertain');
});

test('jawaban rusak tidak membuat crash', () => {
  assert.equal(interpretStepCheck('bukan json', step).status, 'uncertain');
  assert.equal(interpretStepCheck('{"status":"hack"}', step).status, 'uncertain');
});

test('setiap tahap modul punya field wajib', () => {
  for (const s of mod.steps) {
    for (const k of ['id', 'title', 'instruction', 'success_criteria', 'common_mistakes']) assert.ok(s[k] !== undefined, `${s.id}.${k}`);
    assert.match(buildStepCheckPrompt(s), /Kriteria berhasil/);
  }
});

import { validateModule, summarizeLogs, scoreEvaluation } from '../lib/core.js';

test('validasi modul menangkap kesalahan editor', () => {
  assert.deepEqual(validateModule(mod), []);
  const bad = structuredClone(mod);
  bad.steps[1].id = bad.steps[0].id; bad.steps[2].instruction = ''; bad.steps[3].common_mistakes = [{ mistake: 'x' }];
  const errs = validateModule(bad).join('\n');
  assert.match(errs, /dobel/); assert.match(errs, /instruction/); assert.match(errs, /fix/);
});

test('ringkasan log progres', () => {
  const L = (o) => JSON.stringify({ sessionId: 'a', at: '2026-11-11T10:00:00Z', ...o });
  const p = summarizeLogs([L({ type: 'session_start' }), L({ type: 'step_done', step: 's1', source: 'vision' }),
    L({ type: 'question', step: 's1' }), L({ type: 'session_done', at: '2026-11-11T10:12:00Z' }), 'rusak']);
  assert.equal(p.completed, 1); assert.equal(p.sessions[0].minutes, 12);
  assert.deepEqual(p.steps[0], { step: 's1', done: 1, vision: 1, manual: 0, questions: 1, mistakes: 0, checks: 0, hints: 0 });
});

test('skor evaluasi', () => {
  const s = scoreEvaluation([{ label: 'done', predicted: 'done' }, { label: 'not_yet', predicted: 'done' }, { label: 'done', predicted: 'uncertain' }, { label: 'mistake', predicted: 'mistake' }]);
  assert.equal(s.accuracy, 0.5); assert.equal(s.doneRecall, 0.5); assert.equal(s.falseDoneRate, 0.5); assert.equal(s.uncertainRate, 0.25);
});

import { createJpegAssembler } from '../public/js/sources.js';
test('perakit JPEG OpenGlass: potongan berurutan, paket hilang dibuang', () => {
  const got = [];
  const feed = createJpegAssembler((j) => got.push([...j]));
  feed(Uint8Array.from([0, 0, 1, 2])); feed(Uint8Array.from([1, 0, 3])); feed(Uint8Array.from([0xff, 0xff]));
  assert.deepEqual(got, [[1, 2, 3]]);
  feed(Uint8Array.from([0, 0, 9])); feed(Uint8Array.from([2, 0, 9])); feed(Uint8Array.from([0xff, 0xff]));
  assert.equal(got.length, 1, 'foto dengan paket hilang tidak dipakai');
});

import { buildStepCheckPrompt as bp } from '../lib/core.js';
test('prompt multi-frame menyebut contoh & riwayat', () => {
  const p = bp(mod.steps[1], { frames: 3, examples: 2, history: [{ status: 'not_yet', observation: 'celah belum terbuka' }] });
  assert.match(p, /2 foto pertama adalah CONTOH BENAR/);
  assert.match(p, /3 foto berikutnya/);
  assert.match(p, /celah belum terbuka/);
});

import { confusionMatrix } from '../lib/core.js';
test('matriks kebingungan', () => {
  const m = confusionMatrix([{ label: 'done', predicted: 'done' }, { label: 'done', predicted: 'uncertain' }, { label: 'mistake', predicted: 'aneh' }]);
  assert.equal(m.done.done, 1); assert.equal(m.done.uncertain, 1); assert.equal(m.mistake.error, 1);
});
