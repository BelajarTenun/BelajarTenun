import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificationReport, cohenKappa, mistakeReport, segmentF1, editScore, boundaryF1, retrievalReport, bootstrapCI, percentile } from '../lib/metrics.js';
import { splitFor, datasetHash } from '../lib/benchmark.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('laporan klasifikasi: P/R/F1 per kelas dan macro-F1 dihitung manual', () => {
  const pairs = [
    { label: 'done', predicted: 'done' }, { label: 'done', predicted: 'not_yet' },
    { label: 'not_yet', predicted: 'not_yet' }, { label: 'not_yet', predicted: 'done' },
    { label: 'mistake', predicted: 'mistake' }, { label: 'mistake', predicted: 'uncertain' },
  ];
  const r = classificationReport(pairs, ['done', 'not_yet', 'mistake']);
  near(r.accuracy, 3 / 6);
  near(r.perClass.done.precision, 1 / 2); near(r.perClass.done.recall, 1 / 2);
  near(r.perClass.mistake.precision, 1); near(r.perClass.mistake.recall, 1 / 2); near(r.perClass.mistake.f1, 2 / 3);
  near(r.macroF1, (0.5 + 0.5 + 2 / 3) / 3);
});

test("Cohen's kappa: 1 untuk sepakat penuh, 0 untuk setara kebetulan", () => {
  near(cohenKappa([{ label: 'a', predicted: 'a' }, { label: 'b', predicted: 'b' }], ['a', 'b']), 1);
  near(cohenKappa([{ label: 'a', predicted: 'a' }, { label: 'a', predicted: 'b' }, { label: 'b', predicted: 'a' }, { label: 'b', predicted: 'b' }], ['a', 'b']), 0);
});

test('deteksi kesalahan: biner + ketepatan jenis', () => {
  const r = mistakeReport([
    { label: 'mistake', predicted: 'mistake', mistakeIndex: 1, predictedMistakeIndex: 1 },
    { label: 'mistake', predicted: 'mistake', mistakeIndex: 2, predictedMistakeIndex: 1 },
    { label: 'done', predicted: 'mistake' },
    { label: 'mistake', predicted: 'done', mistakeIndex: 1 },
  ]);
  near(r.detection.precision, 2 / 3); near(r.detection.recall, 2 / 3);
  near(r.typeAccuracy, 0.5);
});

test('segmentasi: F1@IoU, Edit score, F1 batas', () => {
  const gt = [{ stepId: 'a', start: 0, end: 10 }, { stepId: 'b', start: 10, end: 20 }];
  const exact = segmentationReport2(gt, gt);
  assert.deepEqual(exact, [1, 1, 100, 1]);
  const shifted = [{ stepId: 'a', start: 0, end: 14 }, { stepId: 'b', start: 14, end: 20 }];
  near(segmentF1(shifted, gt, 0.5), 1);            // IoU a = 10/14, b = 6/10 → keduanya ≥ 0.5
  near(segmentF1(shifted, gt, 0.75), 0);
  near(boundaryF1(shifted, gt, 3), 2 / 3);         // batas 0 & 20 cocok, 14 vs 10 tidak
  near(editScore([{ stepId: 'b', start: 0, end: 5 }, { stepId: 'a', start: 5, end: 9 }], gt), 0); // urutan terbalik
  near(editScore([...gt, { stepId: 'a', start: 20, end: 25 }], gt), 100 * (1 - 1 / 3)); // over-segmentation
});
const segmentationReport2 = (p, g) => [segmentF1(p, g, 0.5), segmentF1(p, g, 0.1), editScore(p, g), boundaryF1(p, g, 1)];

test('retrieval: recall@k, MRR, abstention', () => {
  const r = retrievalReport([
    { expected: ['x'], retrieved: ['x', 'y'] }, { expected: ['x'], retrieved: ['y', 'x'] }, { expected: ['x'], retrieved: ['y'] },
    { expected: [], retrieved: [] }, { expected: [], retrieved: ['y'] },
  ], 3);
  near(r.recallAtK, 2 / 3); near(r.mrr, (1 + 0.5 + 0) / 3); near(r.abstention, 0.5);
});

test('bootstrap deterministik dan mengapit nilai', () => {
  const xs = Array.from({ length: 50 }, (_, i) => i % 2);
  const a = bootstrapCI(xs, (s) => s.reduce((p, x) => p + x, 0) / s.length), b = bootstrapCI(xs, (s) => s.reduce((p, x) => p + x, 0) / s.length);
  assert.deepEqual(a, b);
  assert.ok(a.low <= a.value && a.value <= a.high);
  near(percentile([1, 2, 3, 4], 0.5), 2.5);
});

test('split per penenun: stabil, tidak tergantung huruf besar, mendekati 60/20/20', () => {
  assert.equal(splitFor('Ibu Ani'), splitFor('  ibu ani '));
  const counts = { train: 0, val: 0, test: 0 };
  for (let i = 0; i < 3000; i++) counts[splitFor(`penenun-${i}`)]++;
  assert.ok(Math.abs(counts.test / 3000 - 0.2) < 0.03 && Math.abs(counts.val / 3000 - 0.2) < 0.03);
  assert.equal(datasetHash([{ recording: 'r', file: 'a', stepId: 's', label: 'done' }]), datasetHash([{ recording: 'r', file: 'a', stepId: 's', label: 'done' }]));
});
