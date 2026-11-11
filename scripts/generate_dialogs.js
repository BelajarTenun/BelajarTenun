// Buat dialog tutor sintetis (pola HowToDIV) untuk satu modul, lalu uji tutor dengannya.
//   node scripts/generate_dialogs.js --module draf-tenun-ikat-sikka [--count 4] [--kb]
//   --kb : tambahkan pertanyaan/jawaban dari dialog sebagai kandidat knowledge base (draft)
import { getModule, logEvent } from '../lib/data.js';
import { generateDialogs, evaluateDialog, kbCandidates } from '../lib/dialog-gen.js';
import { createSession } from '../lib/session.js';
import { answer, loadKnowledge, saveKnowledge } from '../lib/knowledge.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const module = await getModule(arg('module'));
const dialogs = await generateDialogs(module, { count: Number(arg('count', 4)) });
const results = [];
for (const d of dialogs) {
  results.push(await evaluateDialog(d, () => createSession(module, {
    checkStep: async () => ({ status: 'uncertain', confidence: 0 }),
    ask: (q, step) => answer(q, { step, moduleId: module.id }),
    log: () => {},
  })));
}
console.table(results.map((r) => ({ dialog: r.dialog, cek: r.checks, lulus: r.passed, skor: r.score.toFixed(2) })));
for (const r of results) for (const f of r.failures.slice(0, 5)) console.log('  ✘', JSON.stringify(f));
if (process.argv.includes('--kb')) {
  const kb = await loadKnowledge();
  const fresh = kbCandidates(dialogs, module.id).filter((e) => !kb.entries.some((x) => x.id === e.id));
  kb.entries.push(...fresh); await saveKnowledge(kb);
  console.log(`${fresh.length} kandidat knowledge base (draft) ditambahkan.`);
}
await logEvent({ type: 'dialog_eval', module: module.id, results: results.map(({ failures, ...r }) => r) });
