// Technical validation: uji akurasi deteksi tahap memakai dataset rekaman berlabel.
// Pemakaian (server harus jalan dalam mode AI):
//   node scripts/evaluate.js [http://localhost:3000] [jumlah-frame-terakhir=3]
// Frame terakhir dari tiap rekaman dibandingkan dengan labelnya (done / not_yet / mistake).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scoreEvaluation } from '../lib/core.js';

const BASE = process.argv[2] || 'http://localhost:3000';
const LAST_N = Number(process.argv[3] || 3);
const DIR = new URL('../data/recordings/', import.meta.url).pathname;

const config = await fetch(`${BASE}/api/config`).then((r) => r.json());
if (!config.ai) { console.error('Server belum dalam mode AI (GEMINI_API_KEY kosong). Evaluasi dibatalkan.'); process.exit(1); }

const results = [];
for (const id of await readdir(DIR)) {
  const meta = await readFile(join(DIR, id, 'meta.json'), 'utf8').then(JSON.parse).catch(() => null);
  if (!meta) continue;
  const frames = meta.files.filter((f) => f.endsWith('.jpg')).sort().slice(-LAST_N);
  for (const f of frames) {
    const image = (await readFile(join(DIR, id, f))).toString('base64');
    const t0 = Date.now();
    const r = await fetch(`${BASE}/api/check-step`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stepId: meta.stepId, image }),
    }).then((x) => x.json());
    results.push({ recording: id, frame: f, step: meta.stepId, label: meta.label, predicted: r.status, confidence: r.confidence, ms: Date.now() - t0 });
    process.stdout.write(r.status === meta.label ? '.' : 'x');
  }
}
console.log();
if (!results.length) { console.log('Belum ada frame di data/recordings. Rekam dulu lewat halaman /rekam.html.'); process.exit(0); }

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const overall = scoreEvaluation(results);
console.log(`Frame diuji      : ${overall.n}`);
console.log(`Akurasi          : ${pct(overall.accuracy)}`);
console.log(`Recall "selesai" : ${pct(overall.doneRecall)}   (target ≥ 80%)`);
console.log(`Salah "selesai"  : ${pct(overall.falseDoneRate)}   (target ≤ 10%)`);
console.log(`Ragu → konfirmasi: ${pct(overall.uncertainRate)}`);
console.log(`Rata-rata jeda   : ${Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length)} ms   (target < 5000)`);
for (const step of new Set(results.map((r) => r.step))) {
  const s = scoreEvaluation(results.filter((r) => r.step === step));
  console.log(`  ${step.padEnd(20)} akurasi ${pct(s.accuracy)} (n=${s.n})`);
}
const out = `logs/eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(`../${out}`, import.meta.url), JSON.stringify({ overall, results }, null, 2)).catch(() => {});
console.log(`Detail: ${out}`);
