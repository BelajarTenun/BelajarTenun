// Evaluasi pelacakan tahap & deteksi kesalahan dari foto kacamata (procedure state tracking).
//
//   node scripts/evaluate.js [--module tidore-dasar] [--split test|val|all] [--method few-shot|zero-shot]
//                            [--limit 300] [--min-macro-f1 0.7]
//
// Protokol:
// - Data dibagi per penenun (lib/benchmark.js). Angka dilaporkan pada split "test";
//   contoh few-shot HANYA diambil dari split "train" → tidak ada kebocoran antar penenun.
// - Metrik: akurasi, macro-F1, Cohen's kappa, P/R/F1 per kelas, deteksi kesalahan (biner) +
//   ketepatan jenis kesalahan, tingkat "salah bilang selesai", latensi p50/p95,
//   semua dengan interval kepercayaan bootstrap 95%.
// - Hasil: logs/eval/<waktu>-steps.json (lengkap + manifest) dan .md (ringkas untuk laporan).
import * as data from '../lib/data.js';
import { store } from '../lib/store.js';
import { aiEnabled, usageStats } from '../lib/ai.js';
import { config } from '../lib/config.js';
import { confusionMatrix } from '../lib/core.js';
import { classificationReport, mistakeReport, bootstrapCI, percentile } from '../lib/metrics.js';
import { splitFor, groupOf, datasetHash, runManifest, mdTable, pct, ci } from '../lib/benchmark.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? def : process.argv[i + 1] ?? true; };
if (!aiEnabled()) { console.error('AI belum dikonfigurasi (GEMINI_API_KEY atau Vertex AI). Evaluasi butuh AI.'); process.exit(1); }
const { checkStep } = await import('../server.js');

const module = await data.getModule(arg('module'));
const split = arg('split', 'test');
const method = arg('method', 'few-shot');
const limit = Number(arg('limit', 300));
const LABELS = ['done', 'not_yet', 'mistake'];

const recs = (await data.listRecordings()).filter((r) => r.module === module.id && (r.consent?.scopes?.includes('pengembangan_ai') ?? true));
const splitOf = new Map(recs.map((r) => [r.id, splitFor(groupOf(r))]));
const frames = recs
  .filter((r) => split === 'all' || splitOf.get(r.id) === split)
  .flatMap((r) => data.labeledFrames(r))
  .filter((f) => f.last !== false || f.file.startsWith('seg-'))
  .slice(0, limit);
const counts = Object.fromEntries(['train', 'val', 'test'].map((s) => [s, recs.filter((r) => splitOf.get(r.id) === s).length]));
if (!frames.length) {
  console.log(`Belum ada frame berlabel di split "${split}". Rekaman per split: ${JSON.stringify(counts)}.`);
  console.log('Rekam lewat /rekam.html atau ekspor segmen di /anotasi.html. Perlu ≥3 penenun berbeda agar ketiga split terisi.');
  process.exit(0);
}

const results = [];
for (const f of frames) {
  const step = module.steps.find((s) => s.id === f.stepId);
  if (!step) continue;
  const image = (await store.readFile(`recordings/${f.recording}/${f.file}`)).toString('base64');
  const t0 = Date.now();
  let r;
  try {
    r = await checkStep(module, { ...step, auto_detect: true }, [image], {
      useExamples: method === 'few-shot', excludeRecording: f.recording, allowExample: (rec) => splitOf.get(rec.id) === 'train',
    });
  } catch (e) { r = { status: 'error', confidence: 0, observation: e.message }; }
  results.push({ recording: f.recording, frame: f.file, step: f.stepId, label: f.label, mistakeIndex: f.mistakeIndex ?? null,
    predicted: r.status, predictedMistakeIndex: r.mistakeIndex ?? null, confidence: r.confidence, ms: Date.now() - t0 });
  process.stdout.write(r.status === f.label ? '.' : 'x');
}
console.log();

const report = classificationReport(results, LABELS);
const mistakes = mistakeReport(results);
const falseDone = (rs) => { const p = rs.filter((r) => r.predicted === 'done'); return p.length ? p.filter((r) => r.label !== 'done').length / p.length : 0; };
const ms = results.map((r) => r.ms);
const summary = {
  accuracy: bootstrapCI(results, (s) => s.filter((r) => r.label === r.predicted).length / s.length),
  macroF1: bootstrapCI(results, (s) => classificationReport(s, LABELS).macroF1),
  falseDoneRate: bootstrapCI(results, falseDone),
  uncertainRate: results.filter((r) => r.predicted === 'uncertain').length / results.length,
  kappa: report.kappa,
  latencyMs: { p50: percentile(ms, 0.5), p95: percentile(ms, 0.95) },
};
const perStep = [...new Set(results.map((r) => r.step))].map((s) => {
  const rs = results.filter((r) => r.step === s);
  return { step: s, n: rs.length, accuracy: rs.filter((r) => r.label === r.predicted).length / rs.length, macroF1: classificationReport(rs, LABELS).macroF1 };
});
const manifest = runManifest({
  task: 'step-state', module: module.id, split, method, model: config.geminiModel, provider: config.aiProvider,
  datasetHash: datasetHash(frames), frames: results.length, recordingsPerSplit: counts,
});

const stamp = manifest.at.replace(/[:.]/g, '-');
const md = [
  `# Evaluasi pelacakan tahap: ${module.title}`, '',
  `Split **${split}** · metode **${method}** · model ${manifest.provider}/${manifest.model} · ${results.length} frame · dataset ${manifest.datasetHash} · commit ${manifest.commit}`, '',
  mdTable(['Metrik', 'Nilai [IK 95%]'], [
    ['Akurasi', ci(summary.accuracy)], ['Macro-F1', ci(summary.macroF1)], ["Cohen's kappa", summary.kappa.toFixed(3)],
    ['Salah bilang "selesai"', ci(summary.falseDoneRate)], ['Minta konfirmasi (ragu)', pct(summary.uncertainRate)],
    ['Deteksi kesalahan: P / R / F1', `${pct(mistakes.detection.precision)} / ${pct(mistakes.detection.recall)} / ${pct(mistakes.detection.f1)}`],
    ['Ketepatan jenis kesalahan', `${pct(mistakes.typeAccuracy)} (n=${mistakes.typeSupport})`],
    ['Latensi p50 / p95', `${Math.round(summary.latencyMs.p50)} / ${Math.round(summary.latencyMs.p95)} ms`],
  ]), '',
  '## Per kelas', '',
  mdTable(['Kelas', 'Precision', 'Recall', 'F1', 'n'], LABELS.map((c) => [c, pct(report.perClass[c].precision), pct(report.perClass[c].recall), pct(report.perClass[c].f1), report.perClass[c].support])), '',
  '## Per tahap', '',
  mdTable(['Tahap', 'n', 'Akurasi', 'Macro-F1'], perStep.map((s) => [s.step, s.n, pct(s.accuracy), pct(s.macroF1)])), '',
].join('\n');

await store.writeJson(`logs/eval/${stamp}-steps.json`, { manifest, summary, report, mistakes, perStep, confusion: confusionMatrix(results), usage: usageStats(), results });
await store.writeFile(`logs/eval/${stamp}-steps.md`, md);
console.log(md);
console.log(`Detail: logs/eval/${stamp}-steps.json`);

const min = Number(arg('min-macro-f1', 0));
if (min && report.macroF1 < min) { console.error(`Macro-F1 ${pct(report.macroF1)} di bawah ambang ${pct(min)}`); process.exit(1); }
