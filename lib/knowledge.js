// Knowledge base tervalidasi + pencarian (F5).
// Status entri: draft → ditinjau → tervalidasi. Produksi (KB_SERVE_DRAFT=0) hanya memakai yang tervalidasi.
// Pencarian hibrid: embedding Gemini (kemiripan makna) + kata kunci; tanpa API key hanya kata kunci.
import { createHash } from 'node:crypto';
import { config } from './config.js';
import { store } from './store.js';
import { aiEnabled, embed, generate } from './ai.js';
import { searchKnowledge, buildQaPrompt } from './core.js';

export const STATUSES = ['draft', 'ditinjau', 'tervalidasi'];
const FILE = 'knowledge.json';
const EMB_FILE = 'cache/embeddings.json';
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const entryText = (e) => `${e.question}\n${e.answer}\n${(e.keywords || []).join(', ')}`;

export function normalizeEntry(e) {
  const status = STATUSES.includes(e.status) ? e.status : e.validated_by ? 'tervalidasi' : 'draft';
  return { ...e, status, keywords: Array.isArray(e.keywords) ? e.keywords : [], module: e.module ?? null };
}
export const loadKnowledge = async () => {
  const kb = await store.readJson(FILE, { entries: [] });
  return { ...kb, entries: kb.entries.map(normalizeEntry) };
};
export async function saveKnowledge(kb) {
  for (const [i, e] of kb.entries.entries()) {
    if (!e.id || !e.question || !e.answer) throw Object.assign(new Error(`Entri ${i + 1}: id, question, answer wajib diisi`), { code: 400 });
  }
  const ids = kb.entries.map((e) => e.id);
  if (new Set(ids).size !== ids.length) throw Object.assign(new Error('ID entri ada yang dobel'), { code: 400 });
  await store.writeJson(FILE, { ...kb, entries: kb.entries.map(normalizeEntry) });
}

/** Entri yang boleh dipakai untuk menjawab pengguna. */
export function servable(entries, moduleId) {
  return entries.filter((e) => (config.kbServeDraft || e.status === 'tervalidasi') && (!e.module || e.module === moduleId));
}

const cosine = (a, b) => {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na * nb) || 1);
};

async function embeddingsFor(entries) {
  const cache = await store.readJson(EMB_FILE, {});
  const missing = entries.filter((e) => !cache[hash(entryText(e))]);
  if (missing.length) {
    const vecs = await embed(missing.map(entryText));
    missing.forEach((e, i) => { cache[hash(entryText(e))] = vecs[i]; });
    await store.writeJson(EMB_FILE, cache);
  }
  return entries.map((e) => cache[hash(entryText(e))]);
}

/** Cari entri relevan. Mengembalikan [{entry, score}]. */
export async function retrieve(question, entries, limit = 3) {
  const kw = searchKnowledge(entries, question, entries.length).map((e, i) => ({ entry: e, kw: 1 - i / (entries.length + 1) }));
  if (!aiEnabled() || !entries.length) return kw.slice(0, limit).map((r) => ({ entry: r.entry, score: r.kw }));
  try {
    const [qv] = await embed([question], 'RETRIEVAL_QUERY');
    const vecs = await embeddingsFor(entries);
    const kwMap = new Map(kw.map((r) => [r.entry.id, r.kw]));
    return entries
      .map((e, i) => ({ entry: e, score: cosine(qv, vecs[i]) + 0.15 * (kwMap.get(e.id) || 0) }))
      .filter((r) => r.score >= 0.55)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return kw.slice(0, limit).map((r) => ({ entry: r.entry, score: r.kw }));
  }
}

const NO_ANSWER = 'Maaf, aku belum punya jawaban tervalidasi untuk itu. Pertanyaanmu sudah kucatat untuk penenun pendamping.';

/** Jawab pertanyaan hanya dari pengetahuan tervalidasi; wajib menyebut sumber. */
export async function answer(question, { step, moduleId, userId } = {}) {
  const kb = await loadKnowledge();
  const hits = await retrieve(question, servable(kb.entries, moduleId));
  if (!hits.length) {
    await store.append('logs/unanswered.jsonl', JSON.stringify({ question, moduleId, step: step?.id ?? null, userId: userId ?? null, at: new Date().toISOString() }) + '\n');
    return { answer: NO_ANSWER, sources: [], mode: 'none' };
  }
  const sources = hits.map((h) => h.entry.id);
  if (!aiEnabled()) return { answer: hits[0].entry.answer, sources, mode: 'keyword' };
  const text = await generate([{ text: buildQaPrompt(question, step, hits.map((h) => h.entry)) }], { kind: 'qa' });
  return { answer: text.trim(), sources, mode: 'ai' };
}

export async function unanswered() {
  return (await store.readLines('logs/unanswered.jsonl')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
}
