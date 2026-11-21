// Gerbang rilis model penilai tahap: kandidat (hasil tuning) vs baseline (Gemini + few-shot) pada set UJI per orang.
//   node scripts/train/gate.js --module tidore-dasar --candidate projects/<p>/locations/<l>/endpoints/<id>
// Keluar 0 bila lolos (boleh set STEP_CHECK_MODEL=<candidate>), 1 bila gagal. Laporan di logs/eval/.
import * as data from '../../lib/data.js';
import { store } from '../../lib/store.js';
import { config } from '../../lib/config.js';
import { personOf, splitOf } from '../../lib/splits.js';
import { perceptionReport, perceptionGate } from '../../lib/perception-metrics.js';
import { checkStep } from '../../server.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const module = await data.getModule(arg('module'));
const candidate = arg('candidate');
if (!candidate) { console.error('Wajib --candidate <endpoint model hasil tuning>'); process.exit(2); }
const steps = new Map(module.steps.map((s) => [s.id, s]));
const test = [];
for (const r of await data.listRecordings()) {
  if (r.module !== module.id || !r.consent?.scopes?.includes('pengembangan_ai') || splitOf(personOf(r)) !== 'test') continue;
  for (const f of data.labeledFrames(r)) if (steps.has(f.stepId)) test.push({ r, f });
}
if (!test.length) { console.error('Set uji kosong: belum ada rekaman berlabel dari orang yang masuk split "test".'); process.exit(2); }

async function run(name, opts) {
  const rows = [];
  for (const { r, f } of test) {
    const img = (await store.readFile(`recordings/${r.id}/${f.file}`)).toString('base64');
    const t0 = Date.now();
    // Baseline boleh memakai contoh few-shot, tapi hanya dari orang di split "train" (tidak bocor ke uji).
    const out = await checkStep(module, { ...steps.get(f.stepId), auto_detect: true }, [img], { ...opts, excludeRecording: r.id, allowExample: (rec) => splitOf(personOf(rec)) === 'train' }).catch(() => ({ status: 'uncertain' }));
    rows.push({ truth: f.label, pred: out.status, ms: Date.now() - t0 });
    process.stdout.write('.');
  }
  console.log(` ${name}`);
  return perceptionReport(rows);
}
const baseline = await run('baseline', { model: config.geminiModel, useExamples: true });
const cand = await run('kandidat', { model: candidate, useExamples: false });
const g = perceptionGate(cand, baseline);
const fmt = (x) => (x == null ? '–' : typeof x === 'number' ? (x <= 1 ? `${(x * 100).toFixed(1)}%` : `${x}`) : x);
console.table({ baseline: { macroF1: fmt(baseline.macroF1), selesaiPalsu: fmt(baseline.falseDoneRate), recallKesalahan: fmt(baseline.mistakeRecall), cakupan: fmt(baseline.coverage), p95ms: baseline.p95ms }, kandidat: { macroF1: fmt(cand.macroF1), selesaiPalsu: fmt(cand.falseDoneRate), recallKesalahan: fmt(cand.mistakeRecall), cakupan: fmt(cand.coverage), p95ms: cand.p95ms } });
for (const [k, v] of Object.entries(g.checks)) console.log(`${v ? 'LULUS' : 'GAGAL'}  ${k}`);
await store.writeJson(`logs/eval/${new Date().toISOString().replace(/[:.]/g, '-')}-perception-gate.json`, { module: module.id, candidate, n: test.length, baseline, candidate_report: cand, gate: g });
process.exit(g.pass ? 0 : 1);
