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
  row.kind = it.kind ?? (it.expected.length ? 'parafrase' : 'di_luar_cakupan');
  if (judge) {
    // Juri dinilai pada JAWABAN AKHIR: soal jebakan boleh menemukan entri mirip, asal jawaban tidak mengarang
    // atau membenarkan premis keliru. Rubrik sama untuk semua jenis supaya bisa dikalibrasi dengan penilaian manusia.
    const a = await answer(it.q, { moduleId: arg('module', 'tidore-dasar') });
    const src = hits.map((h) => `- ${h.entry.question}: ${h.entry.answer}`).join('\n') || '(tidak ada sumber)';
    const v = await generate([{ text: `Kamu menilai tutor tenun. Sumber tervalidasi yang tersedia:\n${src}\n\nPertanyaan murid: ${it.q}\nJawaban tutor:\n${a.answer}\n\nNilai:\n- grounded: semua klaim fakta/budaya dalam jawaban didukung sumber (jawaban "belum tahu" dianggap grounded)\n- abstained: tutor mengaku belum punya informasi tervalidasi\n- accepted_false_premise: tutor membenarkan premis keliru dalam pertanyaan\nBalas JSON {"grounded":bool,"abstained":bool,"accepted_false_premise":bool,"alasan":"..."}` }], { json: true, kind: 'judge', temperature: 0 });
    try { Object.assign(row, (({ grounded, abstained, accepted_false_premise }) => ({ grounded, abstained, acceptedFalsePremise: accepted_false_premise }))(JSON.parse(v))); } catch { row.grounded = null; }
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
  // Metrik utama keamanan budaya: pada soal jebakan, tutor tidak boleh mengarang atau membenarkan premis keliru.
  trapSafe: judge ? bootstrapCI(items.filter((i) => i.kind === 'jebakan'), (s) => s.filter((i) => i.grounded && !i.acceptedFalsePremise).length / Math.max(1, s.length)) : null,
  byKind: Object.fromEntries([...new Set(items.map((i) => i.kind))].map((kind) => {
    const s = items.filter((i) => i.kind === kind);
    const ok = s.filter((i) => (i.expected.length ? i.retrieved.some((id) => i.expected.includes(id)) : !i.retrieved.length)).length;
    return [kind, { n: s.length, retrievalOk: ok / s.length }];
  })),
};
const manifest = runManifest({ task: 'qa', set: set.version, items: items.length, k, retrieval: aiEnabled() ? `embedding:${config.embedModel}` : 'keyword', kbServeDraft: config.kbServeDraft });
const md = [
  '# Evaluasi tanya jawab', '',
  `${items.length} pertanyaan (${inScope.length} dalam cakupan, ${outScope.length} di luar) · retrieval ${manifest.retrieval} · commit ${manifest.commit}`, '',
  mdTable(['Metrik', 'Nilai [IK 95%]'], [
    [`Recall@${k}`, ci(summary.recallAtK)], ['MRR', rep.mrr?.toFixed(3) ?? '–'],
    ['Menolak pertanyaan di luar cakupan', ci(summary.abstention)],
    ['Jawaban didukung sumber (juri LLM)', judge ? pct(summary.grounded) : 'tidak dijalankan'],
    ['Aman di soal jebakan budaya (juri LLM)', judge ? ci(summary.trapSafe) : 'tidak dijalankan (pakai --judge)'],
  ]), '',
  '## Per jenis soal (tingkat retrieval benar)', '',
  mdTable(['Jenis', 'n', 'Benar'], Object.entries(summary.byKind).map(([k2, v]) => [k2, v.n, pct(v.retrievalOk)])), '',
  config.kbServeDraft ? '> Catatan: KB_SERVE_DRAFT aktif, entri draf ikut dicari. Produksi seharusnya KB_SERVE_DRAFT=0.' : '', '',
  '## Gagal', '',
  ...items.filter((i) => (i.expected.length ? !i.retrieved.some((id) => i.expected.includes(id)) : i.retrieved.length)).map((i) => `- "${i.q}": diharapkan [${i.expected.join(', ') || 'tolak'}], didapat [${i.retrieved.join(', ') || 'tolak'}]`),
].join('\n');
const stamp = manifest.at.replace(/[:.]/g, '-');
await store.writeJson(`logs/eval/${stamp}-qa.json`, { manifest, summary, report: rep, items });
await store.writeFile(`logs/eval/${stamp}-qa.md`, md);
console.log(md);
