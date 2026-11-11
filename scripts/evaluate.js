// Technical validation (F7): uji akurasi deteksi tahap memakai frame berlabel di dataset.
// Pemakaian:
//   GEMINI_API_KEY=… node scripts/evaluate.js [--module tidore-dasar] [--no-examples] [--limit 200] [--min-accuracy 0.8]
// - Frame berlabel berasal dari rekaman per tahap dan dari ekspor segmen anotasi.
// - Contoh few-shot tidak pernah diambil dari rekaman yang sedang diuji (mencegah kebocoran).
// - --min-accuracy membuat skrip keluar dengan kode 1 bila akurasi di bawah ambang (untuk CI/regresi).
import { checkStep } from '../server.js';
import * as data from '../lib/data.js';
import { store } from '../lib/store.js';
import { aiEnabled, usageStats } from '../lib/ai.js';
import { scoreEvaluation, confusionMatrix } from '../lib/core.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? def : process.argv[i + 1] ?? true; };
const flag = (name) => process.argv.includes(`--${name}`);
if (!aiEnabled()) { console.error('GEMINI_API_KEY kosong. Evaluasi butuh AI.'); process.exit(1); }

const module = await data.getModule(arg('module'));
const limit = Number(arg('limit', 300));
const recs = (await data.listRecordings()).filter((r) => r.module === module.id && (r.consent?.scopes?.includes('pengembangan_ai') ?? true));
// Rekaman per tahap: frame terakhir mewakili label (mis. "done" = hasil akhir); segmen: semua frame ekspor.
const frames = recs.flatMap((r) => data.labeledFrames(r).map((f) => ({ ...f, recording: r.id }))).filter((f) => f.last !== false || f.file.startsWith('seg-')).slice(0, limit);
if (!frames.length) { console.log('Belum ada frame berlabel. Rekam (/rekam.html) atau ekspor segmen (/anotasi.html) dulu.'); process.exit(0); }

const results = [];
for (const f of frames) {
  const step = module.steps.find((s) => s.id === f.stepId);
  if (!step) continue;
  const image = (await store.readFile(`recordings/${f.recording}/${f.file}`)).toString('base64');
  const t0 = Date.now();
  let r;
  try { r = await checkStep(module, { ...step, auto_detect: true }, [image], { useExamples: !flag('no-examples'), excludeRecording: f.recording }); }
  catch (e) { r = { status: 'error', confidence: 0, observation: e.message }; }
  results.push({ recording: f.recording, frame: f.file, step: f.stepId, label: f.label, predicted: r.status, confidence: r.confidence, ms: Date.now() - t0 });
  process.stdout.write(r.status === f.label ? '.' : 'x');
}
console.log();

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const overall = scoreEvaluation(results);
const ms = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(`Modul            : ${module.title} ${flag('no-examples') ? '(tanpa contoh few-shot)' : '(dengan contoh few-shot)'}`);
console.log(`Frame diuji      : ${overall.n}`);
console.log(`Akurasi          : ${pct(overall.accuracy)}`);
console.log(`Recall "selesai" : ${pct(overall.doneRecall)}   (target ≥ 80%)`);
console.log(`Salah "selesai"  : ${pct(overall.falseDoneRate)}   (target ≤ 10%)`);
console.log(`Ragu → konfirmasi: ${pct(overall.uncertainRate)}`);
console.log(`Latensi p50 / p95: ${ms[Math.floor(ms.length / 2)]} / ${ms[Math.floor(ms.length * 0.95)]} ms   (target p95 < 5000)`);
console.log('\nMatriks kebingungan (baris = label, kolom = prediksi):');
console.table(confusionMatrix(results));
for (const step of new Set(results.map((r) => r.step))) {
  const s = scoreEvaluation(results.filter((r) => r.step === step));
  console.log(`  ${step.padEnd(22)} akurasi ${pct(s.accuracy)} (n=${s.n})`);
}
const out = `logs/eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await store.writeJson(out, { module: module.id, fewShot: !flag('no-examples'), overall, usage: usageStats(), results });
console.log(`\nDetail: ${out}`);
const min = Number(arg('min-accuracy', 0));
if (min && overall.accuracy < min) { console.error(`Akurasi ${pct(overall.accuracy)} di bawah ambang ${pct(min)}`); process.exit(1); }
