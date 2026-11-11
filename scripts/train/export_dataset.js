// F8: ekspor frame berlabel dari dataset rekaman ke folder per kelas untuk pelatihan model.
//   node scripts/train/export_dataset.js [--module tidore-dasar] [--out dataset]
// Hasil: <out>/<stepId>__<label>/<recording>-<file>.jpg  +  <out>/manifest.json
// Hanya rekaman dengan izin "pengembangan_ai" yang diekspor.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as data from '../../lib/data.js';
import { store } from '../../lib/store.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const module = await data.getModule(arg('module'));
const out = arg('out', 'dataset');
const recs = (await data.listRecordings()).filter((r) => r.module === module.id && r.consent?.scopes?.includes('pengembangan_ai'));
const counts = {};
const items = [];
for (const r of recs) {
  for (const f of data.labeledFrames(r)) {
    const cls = `${f.stepId}__${f.label}`;
    await mkdir(join(out, cls), { recursive: true });
    const name = `${r.id}-${f.file}`;
    await writeFile(join(out, cls, name), await store.readFile(`recordings/${r.id}/${f.file}`));
    counts[cls] = (counts[cls] || 0) + 1;
    items.push({ class: cls, file: `${cls}/${name}`, recording: r.id, group: r.id });
  }
}
await writeFile(join(out, 'manifest.json'), JSON.stringify({ module: module.id, exportedAt: new Date().toISOString(), counts, items }, null, 2));
console.table(counts);
console.log(`${items.length} frame → ${out}/ . Target awal: ≥300 frame per kelas sebelum melatih (lihat docs/RENCANA-IMPLEMENTASI.md F8).`);
