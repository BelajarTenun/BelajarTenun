import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePattern, describeRow, rowRuns, diamondPattern, patternSummary } from '../lib/pattern.js';
import { validateModule, buildStepCheckPrompt } from '../lib/core.js';
import { createSession } from '../lib/session.js';

test('pola latihan belah ketupat valid dan dijelaskan per baris', () => {
  const p = diamondPattern(9);
  assert.deepEqual(validatePattern(p), []);
  assert.equal(describeRow(p, 1).kalimat, 'Baris 1 dari 9: kuning di kolom 5; selebihnya dasar.');
  assert.deepEqual(rowRuns(p, 3).map((x) => [x.from, x.to, x.key]), [[1, 2, '.'], [3, 7, 'K'], [8, 9, '.']]);
  assert.equal(describeRow(p, 10), null);
  assert.equal(patternSummary(p).asli, false);
});

test('baris sama dengan sebelumnya & baris dasar', () => {
  const p = { ...diamondPattern(3), rows: ['...', '.K.', '.K.'] };
  assert.match(describeRow(p, 1).kalimat, /baris dasar saja/);
  assert.match(describeRow(p, 3).kalimat, /sama seperti baris sebelumnya/);
});

test('validasi menolak baris tidak sama panjang dan huruf di luar palet', () => {
  const p = diamondPattern(3);
  assert.ok(validatePattern({ ...p, rows: ['...', '..'] }).length);
  assert.ok(validatePattern({ ...p, rows: ['..Z', '...', '...'] }).some((e) => /"Z"/.test(e)));
  const mod = { id: 'm', title: 'M', steps: [{ id: 'a', title: 'a', instruction: 'b', success_criteria: 'c', common_mistakes: [], pattern: { ...p, technique: 'x' } }] };
  assert.ok(validateModule(mod).some((e) => /teknik/.test(e)));
});

test('sesi: tutor maju baris demi baris, lalu reset saat tahap berganti; penilai kamera menerima grafik', async () => {
  const p = diamondPattern(3);
  const seen = [];
  const mod = { id: 'm', title: 'M', steps: [{ id: 'motif', title: 'Motif', instruction: 'x', success_criteria: 'y', common_mistakes: [], pattern: p, auto_detect: true }, { id: 'tutup', title: 'T', instruction: 'x', success_criteria: 'y', common_mistakes: [] }] };
  const logs = [];
  const s = createSession(mod, { checkStep: async (st, f, o) => (seen.push(o.patternRows), { status: 'not_yet' }), ask: async () => ({}), log: (e) => logs.push(e) });
  s.start();
  assert.equal((await s.tool('get_current_step')).response.grafik_pola.baris_sekarang, 1);
  const r1 = await s.tool('get_pattern_row');
  assert.equal(r1.response.baris, 1); assert.equal(r1.ui.pattern_row.row, 1);
  assert.equal((await s.tool('pattern_row_done')).response.berikutnya.baris, 2);
  await s.tool('pattern_row_done');
  assert.ok((await s.tool('pattern_row_done')).response.semua_baris_selesai);
  assert.equal(logs.filter((e) => e.type === 'pattern_row').length, 3);
  await s.frame('abc', {}, 0);
  assert.deepEqual(seen[0], p.rows);
  assert.match(buildStepCheckPrompt(mod.steps[0], { patternRows: p.rows }), /Grafik pola/);
  await s.tool('mark_step_done', { user_confirmed: true });
  assert.ok((await s.tool('get_pattern_row')).response.error);
});

test('modul Jodati memakai pola latihan yang jelas berlabel bukan motif asli', () => {
  const m = JSON.parse(readFileSync('data/modules/puta-dino-jodati.json', 'utf8'));
  const p = m.steps.find((s) => s.pattern).pattern;
  assert.deepEqual(validateModule(m), []);
  assert.equal(p.authentic, false);
  assert.match(p.label, /bukan motif Jodati asli/);
});
