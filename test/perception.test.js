import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perceptionReport, perceptionGate } from '../lib/perception-metrics.js';
import { splitOf } from '../lib/splits.js';

test('metrik persepsi: selesai palsu dihitung dari yang sebenarnya belum/salah', () => {
  const rows = [
    { truth: 'done', pred: 'done', ms: 400 }, { truth: 'not_yet', pred: 'done', ms: 500 },
    { truth: 'not_yet', pred: 'not_yet', ms: 450 }, { truth: 'mistake', pred: 'uncertain', ms: 600 },
  ];
  const r = perceptionReport(rows);
  assert.equal(r.falseDoneRate, 1 / 3);
  assert.equal(r.mistakeRecall, 0);
  assert.equal(r.coverage, 0.75);
  assert.equal(perceptionGate(r, { macroF1: 0 }).pass, false);
});

test('gerbang lolos hanya bila semua syarat terpenuhi', () => {
  const good = { macroF1: 0.9, falseDoneRate: 0.02, mistakeRecall: 0.7, p95ms: 900 };
  assert.equal(perceptionGate(good, { macroF1: 0.7 }).pass, true);
  assert.equal(perceptionGate(good, { macroF1: 0.85 }).pass, false, 'harus lebih baik ≥10 poin dari baseline');
});

test('pembagian per orang deterministik dan proporsinya wajar', () => {
  assert.equal(splitOf('ibu sari'), splitOf('ibu sari'));
  const n = { train: 0, validation: 0, test: 0 };
  for (let i = 0; i < 2000; i++) n[splitOf(`orang-${i}`)]++;
  assert.ok(n.train > 1300 && n.train < 1500 && n.test > 220 && n.test < 380, JSON.stringify(n));
});
