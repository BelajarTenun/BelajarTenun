// Ekspor dataset supervised fine-tuning (Vertex AI) untuk model penilai tahap ("mata ahli" di balik check_my_work).
//   node scripts/train/export_sft.js --module tidore-dasar --out sft --gcs gs://<bucket>/sft/tidore-dasar-v1
// Hasil: <out>/images/*.jpg, <out>/{train,validation,test}.jsonl, <out>/manifest.json (+ hash tiap berkas).
// Lalu unggah:  gsutil -m cp -r <out>/images <gcs>/  dan buat tuning job dengan train.jsonl & validation.jsonl.
//
// Aturan:
//  - hanya rekaman dengan izin "pengembangan_ai" dan tidak ditarik (labeledFrames sudah memeriksa penarikan izin)
//  - pembagian per ORANG (lib/splits.js); test.jsonl tidak pernah dipakai untuk tuning, hanya untuk gerbang
//  - prompt SAMA dengan produksi (buildStepCheckPrompt tanpa contoh few-shot), target = JSON skema STEP_CHECK_SCHEMA
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import * as data from '../../lib/data.js';
import { store } from '../../lib/store.js';
import { buildStepCheckPrompt } from '../../lib/core.js';
import { personOf, splitOf } from '../../lib/splits.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const module = await data.getModule(arg('module'));
const out = arg('out', 'sft');
const gcs = (arg('gcs', '') || '').replace(/\/$/, '');
if (!gcs.startsWith('gs://')) { console.error('Wajib --gcs gs://bucket/prefix (Vertex SFT membaca gambar dari Cloud Storage)'); process.exit(2); }
await mkdir(join(out, 'images'), { recursive: true });

const steps = new Map(module.steps.map((s) => [s.id, s]));
const lines = { train: [], validation: [], test: [] };
const counts = {}, people = {}, files = [];
const recs = (await data.listRecordings()).filter((r) => r.module === module.id && r.consent?.scopes?.includes('pengembangan_ai'));
for (const r of recs) {
  const person = personOf(r), split = splitOf(person);
  (people[split] ??= new Set()).add(person);
  for (const f of data.labeledFrames(r)) {
    const step = steps.get(f.stepId);
    if (!step) continue;
    const buf = await store.readFile(`recordings/${r.id}/${f.file}`);
    const name = `${r.id}-${f.file}`;
    await writeFile(join(out, 'images', name), buf);
    files.push({ name, sha256: createHash('sha256').update(buf).digest('hex') });
    const mistake = f.label === 'mistake' ? step.common_mistakes?.[(f.mistakeIndex ?? 1) - 1] : null;
    const target = {
      status: f.label, mistake_index: f.label === 'mistake' ? f.mistakeIndex ?? 1 : null, confidence: 0.95,
      observation: f.label === 'done' ? step.success_criteria : f.label === 'mistake' ? (mistake?.mistake ?? 'Ada kesalahan.') : 'Tahap ini belum selesai.',
    };
    lines[split].push(JSON.stringify({
      contents: [
        { role: 'user', parts: [{ fileData: { mimeType: 'image/jpeg', fileUri: `${gcs}/images/${name}` } }, { text: buildStepCheckPrompt(step, { frames: 1, examples: 0, history: [] }) }] },
        { role: 'model', parts: [{ text: JSON.stringify(target) }] },
      ],
    }));
    const k = `${split}/${f.stepId}/${f.label}`;
    counts[k] = (counts[k] || 0) + 1;
  }
}
for (const [split, ls] of Object.entries(lines)) await writeFile(join(out, `${split}.jsonl`), ls.join('\n') + (ls.length ? '\n' : ''));
const manifest = {
  module: module.id, exportedAt: new Date().toISOString(), gcs, splitVersion: 'bt-split-v1',
  people: Object.fromEntries(Object.entries(people).map(([k, v]) => [k, v.size])), counts, files,
};
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.table(counts);
console.log(`orang per split: ${JSON.stringify(manifest.people)}`);
const minPerClass = Math.min(...Object.entries(counts).filter(([k]) => k.startsWith('train/')).map(([, v]) => v));
if (!Number.isFinite(minPerClass) || minPerClass < 100) console.warn('PERINGATAN: kelas latih terkecil < 100 contoh. Rekam lebih banyak sebelum tuning (rencana 6.2: ≥15 orang).');
console.log(`\nUnggah: gsutil -m cp -r ${out}/images ${gcs}/\nTuning: train=${gcs}/train.jsonl validation=${gcs}/validation.jsonl (test.jsonl hanya untuk scripts/train/gate.js)`);
