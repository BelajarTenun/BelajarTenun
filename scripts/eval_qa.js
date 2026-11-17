// Evaluasi tanya jawab pemula (RAG): apakah tutor menemukan pengetahuan yang benar
// dan menolak pertanyaan di luar cakupan alih-alih mengarang.
//
//   node scripts/eval_qa.js [--set data/eval/qa.json] [--module tidore-dasar] [--k 3] [--judge]
//
// Metrik: recall@k, MRR, tingkat penolakan yang benar (abstention), semua dengan IK bootstrap 95%.
// --judge (butuh AI): LLM-as-judge menilai apakah jawaban akhir didukung sumbernya (groundedness).
//   Penilaian juri harus dicocokkan dulu dengan penilaian manusia pada sampel kecil sebelum dilaporkan.
import { readFile } from 'node:fs/promises';
import { loadKnowledge, servable, retrieve, answer } from '../lib/knowledge.js';
import { aiEnabled, generate } from '../lib/ai.js';
import { config } from '../lib/config.js';
import { store } from '../lib/store.js';
import { retrievalReport, bootstrapCI } from '../lib/metrics.js';
import { runManifest, mdTable, pct, ci } from '../lib/benchmark.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? def : process.argv[i + 1] ?? true; };
const set = JSON.parse(await readFile(arg('set', new URL('../data/eval/qa.json', import.meta.url)), 'utf8'));
const k = Number(arg('k', 3));
const judge = process.argv.includes('--judge') && aiEnabled();
const kb = await loadKnowledge();
const entries = servable(kb.entries, arg('module', 'tidore-dasar'));

const items = [];
for (const it of set.items) {
  const hits = await retrieve(it.q, entries, k);
  const row = { q: it.q, expected: it.expected, retrieved: hits.map((h) => h.entry.id) };
  if (judge && hits.length) {
    const a = await answer(it.q, { moduleId: arg('module', 'tidore-dasar') });
    const src = hits.map((h) => `- ${h.entry.question}: ${h.entry.answer}`).join('\n');
    const v = await generate([{ text: `Sumber:\n${src}\n\nJawaban tutor:\n${a.answer}\n\nApakah SEMUA klaim dalam jawaban didukung sumber? Balas JSON {"grounded":true|false,"alasan":"..."}` }], { json: true, kind: 'judge' });
    try { row.grounded = JSON.parse(v).grounded === true; } catch { row.grounded = null; }
    row.answer = a.answer;
  }
  items.push(row);
  process.stdout.write(it.expected.length ? (row.retrieved.some((id) => it.expected.includes(id)) ? '.' : 'x') : (row.retrieved.length ? 'x' : '.'));
}
console.log();

const rep = retrievalReport(items, k);
const inScope = items.filter((i) => i.expected.length), outScope = items.filter((i) => !i.expected.length);
const summary = {
  recallAtK: bootstrapCI(inScope, (s) => retrievalReport(s, k).recallAtK),
  mrr: rep.mrr,
  abstention: bootstrapCI(outScope, (s) => retrievalReport(s, k).abstention),
  grounded: judge ? items.filter((i) => i.grounded === true).length / items.filter((i) => i.grounded != null).length : null,
};
const manifest = runManifest({ task: 'qa', set: set.version, items: items.length, k, retrieval: aiEnabled() ? `embedding:${config.embedModel}` : 'keyword', kbServeDraft: config.kbServeDraft });
const md = [
  '# Evaluasi tanya jawab', '',
  `${items.length} pertanyaan (${inScope.length} dalam cakupan, ${outScope.length} di luar) · retrieval ${manifest.retrieval} · commit ${manifest.commit}`, '',
  mdTable(['Metrik', 'Nilai [IK 95%]'], [
    [`Recall@${k}`, ci(summary.recallAtK)], ['MRR', rep.mrr?.toFixed(3) ?? '–'],
    ['Menolak pertanyaan di luar cakupan', ci(summary.abstention)],
    ['Jawaban didukung sumber (juri LLM)', judge ? pct(summary.grounded) : 'tidak dijalankan'],
  ]), '',
  '## Gagal', '',
  ...items.filter((i) => (i.expected.length ? !i.retrieved.some((id) => i.expected.includes(id)) : i.retrieved.length)).map((i) => `- "${i.q}": diharapkan [${i.expected.join(', ') || 'tolak'}], didapat [${i.retrieved.join(', ') || 'tolak'}]`),
].join('\n');
const stamp = manifest.at.replace(/[:.]/g, '-');
await store.writeJson(`logs/eval/${stamp}-qa.json`, { manifest, summary, report: rep, items });
await store.writeFile(`logs/eval/${stamp}-qa.md`, md);
console.log(md);
