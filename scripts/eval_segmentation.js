// Evaluasi pemotongan video jadi tahap (temporal step segmentation):
// segmen usulan AI dibandingkan dengan segmen yang ditandai penenun/anotator di /anotasi.html.
//
//   node scripts/eval_segmentation.js [--module tidore-dasar] [--tolerance 3]
//
// Metrik baku segmentasi aksi: F1@{10,25,50} (IoU), Edit score, F1 batas tahap (±toleransi detik),
// dilaporkan per rekaman dan rata-rata dengan IK bootstrap 95%.
// Protokol: prediksi = usulan asli AI (meta.aiProposal, disimpan saat "Usulkan dengan AI"),
// acuan = segmen akhir setelah ditinjau manusia (disimpan SETELAH usulan dibuat).
// Dengan begitu AI tidak dinilai terhadap hasilnya sendiri.
import * as data from '../lib/data.js';
import { store } from '../lib/store.js';
import { segmentationReport, bootstrapCI } from '../lib/metrics.js';
import { runManifest, mdTable } from '../lib/benchmark.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? def : process.argv[i + 1] ?? true; };
const tolerance = Number(arg('tolerance', 3));
const moduleId = arg('module', null);
const recs = (await data.listRecordings()).filter((r) => (!moduleId || r.module === moduleId) && r.segments?.length && r.aiProposal);
const rows = [];
for (const r of recs) {
  const ai = r.aiProposal?.segments ?? [], human = r.segments;
  if (!ai.length || !r.segmentsReviewedAt || r.segmentsReviewedAt <= r.aiProposal.at) continue;
  rows.push({ recording: r.id, weaver: r.weaver ?? null, ...segmentationReport(ai, human, { tolerance }) });
}
if (!rows.length) {
  console.log('Belum ada rekaman dengan usulan AI yang sudah ditinjau manusia.');
  console.log('Di /anotasi.html: jalankan "Usulkan dengan AI", koreksi segmennya, lalu simpan.');
  process.exit(0);
}
const mean = (k) => (s) => s.reduce((a, r) => a + r[k], 0) / s.length;
const keys = ['f1_10', 'f1_25', 'f1_50', 'edit', 'boundaryF1'];
const summary = Object.fromEntries(keys.map((k) => [k, bootstrapCI(rows, mean(k))]));
const fmt = (k, c) => (k === 'edit' ? `${c.value.toFixed(1)} [${c.low.toFixed(1)}, ${c.high.toFixed(1)}]` : `${(c.value * 100).toFixed(1)} [${(c.low * 100).toFixed(1)}, ${(c.high * 100).toFixed(1)}]`);
const manifest = runManifest({ task: 'segmentation', module: moduleId, recordings: rows.length, tolerance });
const md = [
  '# Evaluasi segmentasi tahap', '', `${rows.length} rekaman · toleransi batas ±${tolerance} dtk · commit ${manifest.commit}`, '',
  mdTable(['F1@10', 'F1@25', 'F1@50', 'Edit', `F1 batas ±${tolerance}s`], [keys.map((k) => fmt(k, summary[k]))]), '',
  '## Per rekaman', '',
  mdTable(['Rekaman', 'F1@10', 'F1@25', 'F1@50', 'Edit', 'Batas'], rows.map((r) => [r.recording, ...keys.map((k) => (k === 'edit' ? r[k].toFixed(1) : (r[k] * 100).toFixed(1)))])),
].join('\n');
const stamp = manifest.at.replace(/[:.]/g, '-');
await store.writeJson(`logs/eval/${stamp}-segmentation.json`, { manifest, summary, rows });
await store.writeFile(`logs/eval/${stamp}-segmentation.md`, md);
console.log(md);
