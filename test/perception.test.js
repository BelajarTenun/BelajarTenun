import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('blur wajah: kotak dari Vision API diblur, piksel di luar kotak tidak berubah', { skip: (() => { try { execFileSync('ffmpeg', ['-version']); return false; } catch { return 'ffmpeg tidak ada'; } })() }, async () => {
  const { blurFaces } = await import('../lib/face-blur.js');
  const dir = mkdtempSync(join(tmpdir(), 'bt-face-'));
  const src = join(dir, 'a.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x240', '-frames:v', '1', src]);
  const jpeg = readFileSync(src);
  const fetchImpl = async () => ({ ok: true, json: async () => ({ responses: [{ faceAnnotations: [{ boundingPoly: { vertices: [{ x: 100, y: 80 }, { x: 160, y: 80 }, { x: 160, y: 150 }, { x: 100, y: 150 }] } }] }] }) });
  const out = await blurFaces(jpeg, { fetchImpl, token: async () => 't' });
  assert.equal(out.faces, 1);
  const px = (buf, x, y) => { writeFileSync(join(dir, 'p.jpg'), buf); return execFileSync('ffmpeg', ['-v', 'error', '-i', join(dir, 'p.jpg'), '-vf', `crop=2:2:${x - (x % 2)}:${y - (y % 2)},format=gray`, '-f', 'rawvideo', '-']); };
  const diff = (a, b) => Math.abs(a[0] - b[0]);
  // Di dalam wajah: pola testsrc yang tajam harus berubah karena blur. Di pojok jauh: hampir sama (beda kecil karena kompresi JPEG).
  let changed = 0;
  for (const [x, y] of [[110, 90], [130, 110], [150, 140], [120, 130]]) changed += diff(px(jpeg, x, y), px(out.jpeg, x, y)) > 8 ? 1 : 0;
  assert.ok(changed >= 2, 'area wajah terblur');
  assert.ok(diff(px(jpeg, 5, 5), px(out.jpeg, 5, 5)) < 12, 'area di luar wajah utuh');
});
