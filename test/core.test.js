import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchKnowledge, interpretStepCheck, buildStepCheckPrompt } from '../lib/core.js';

const kb = JSON.parse(readFileSync(new URL('../data/knowledge.json', import.meta.url))).entries;
const mod = JSON.parse(readFileSync(new URL('../data/tidore-dasar.json', import.meta.url)));
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
