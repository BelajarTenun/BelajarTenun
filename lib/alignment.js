// Penyelarasan hasil analisis banyak video → taksonomi bersama → kurikulum draf per tradisi
// + modul dasar lintas tradisi. Isi yang sudah divalidasi penenun tidak pernah ditimpa.
import { store } from './store.js';
import { aiEnabled, embed } from './ai.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'tahap';
const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const jaccard = (A, B) => { if (!A.size && !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

export async function loadTaxonomy() {
  return (await store.readJson('taxonomy.json', null)) ?? JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../data/taxonomy.json', import.meta.url), 'utf8'));
}

/** Petakan nama alat/aksi bebas ke id taksonomi (sinonim terpanjang yang cocok). */
export function mapTerms(texts, entries) {
  const out = new Set();
  for (const t of texts) {
    const n = ` ${norm(t)} `;
    let best = null, len = 0;
    for (const e of entries) for (const s of e.synonyms) { const ns = norm(s); if (n.includes(` ${ns} `) || n.includes(` ${ns}`) && ns.length > 4) { if (ns.length > len) { best = e.id; len = ns.length; } } }
    if (best) out.add(best);
  }
  return [...out];
}

/** Siapkan langkah-langkah dari semua analisis dengan id taksonomi & posisi relatif. */
export function prepareSteps(analyses, taxonomy) {
  const all = [];
  for (const a of analyses) {
    const n = a.steps.length;
    a.steps.forEach((s, i) => {
      if (s.ragu && (s.confidence ?? 0) < 0.5) return; // buang tahap yang ragu & tidak yakin
      all.push({
        ...s, sourceId: a.sourceId, tradition: a.tradition, region: a.region, pos: n > 1 ? i / (n - 1) : 0.5,
        toolIds: mapTerms([...(s.tools || []), s.title, ...(s.actions || [])], taxonomy.tools),
        actionIds: mapTerms([s.title, ...(s.actions || [])], taxonomy.actions),
      });
    });
  }
  return all;
}

/** Kemiripan dua langkah: aksi taksonomi (paling kuat) + alat + kata judul (+ embedding bila ada). */
export function similarity(a, b) {
  const act = jaccard(new Set(a.actionIds), new Set(b.actionIds));
  const tool = jaccard(new Set(a.toolIds), new Set(b.toolIds));
  const words = jaccard(tokens(`${a.title} ${(a.actions || []).join(' ')}`), tokens(`${b.title} ${(b.actions || []).join(' ')}`));
  const emb = a.vec && b.vec ? cosine(a.vec, b.vec) : null;
  const base = 0.5 * act + 0.2 * tool + 0.3 * words;
  return emb == null ? base : 0.6 * base + 0.4 * emb;
}
const cosine = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2; } return d / (Math.sqrt(x * y) || 1); };

/** Klaster serakah: tiap langkah masuk ke klaster paling mirip (rata-rata) bila ≥ ambang. */
export function cluster(steps, threshold = 0.42) {
  const clusters = [];
  for (const s of steps) {
    let best = null, bestSim = threshold;
    for (const c of clusters) {
      const sim = c.members.reduce((t, m) => t + similarity(s, m), 0) / c.members.length;
      if (sim >= bestSim) { best = c; bestSim = sim; }
    }
    if (best) best.members.push(s); else clusters.push({ members: [s] });
  }
  return clusters.map((c, i) => summarize(c, i));
}

const mode = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; };
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0.5; };

function dedupeText(items, key = (x) => x, limit = 5) {
  const out = [];
  for (const it of items) if (it && !out.some((o) => jaccard(tokens(key(o)), tokens(key(it))) > 0.6)) out.push(it);
  return out.slice(0, limit);
}

function summarize(c, i) {
  const m = c.members;
  const bestMember = [...m].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  const actionId = mode(m.flatMap((x) => x.actionIds));
  return {
    id: `k${i}`, actionId: actionId ?? null, title: mode(m.map((x) => x.title)) ?? bestMember.title,
    traditions: [...new Set(m.map((x) => x.tradition))], sources: [...new Set(m.map((x) => x.sourceId))],
    pos: median(m.map((x) => x.pos)), members: m,
    instruction: bestMember.instruction ?? null, success_criteria: bestMember.success_visual ?? null,
    tips: dedupeText(m.flatMap((x) => x.tips || [])),
    common_mistakes: dedupeText(m.flatMap((x) => x.mistakes || []), (x) => x.mistake),
    toolIds: [...new Set(m.flatMap((x) => x.toolIds))],
  };
}

/** Urutan kanonik: posisi median + kemenangan berpasangan (A sebelum B di video yang sama). */
export function canonicalOrder(clusters) {
  const wins = new Map(clusters.map((c) => [c.id, 0]));
  for (const a of clusters) for (const b of clusters) {
    if (a === b) continue;
    for (const src of a.sources) {
      const ta = a.members.filter((x) => x.sourceId === src).map((x) => x.start);
      const tb = b.members.filter((x) => x.sourceId === src).map((x) => x.start);
      if (ta.length && tb.length && Math.min(...ta) < Math.min(...tb)) wins.set(a.id, wins.get(a.id) + 1);
    }
  }
  return [...clusters].sort((a, b) => (wins.get(b.id) - wins.get(a.id)) || (a.pos - b.pos));
}

function toModuleStep(c, tradition) {
  // Modul satu tradisi memakai isi dari video tradisi itu sendiri; modul lintas tradisi memakai gabungan.
  const own = tradition ? c.members.filter((m) => m.tradition === tradition) : c.members;
  const v = tradition ? summarize({ members: own }, 0) : c;
  return {
    id: slug(c.actionId || v.title), title: v.title,
    instruction: v.instruction || `Lakukan: ${v.title}.`,
    tips: v.tips, success_criteria: v.success_criteria || v.title,
    common_mistakes: v.common_mistakes.filter((x) => x.mistake && x.fix),
    auto_detect: true, validated_by: null, genericStepId: c.actionId ?? null,
    provenance: own.slice(0, 8).map((m) => ({ sourceId: m.sourceId, start: m.start, end: m.end })),
    fieldStatus: { title: 'usulan_ai', instruction: 'usulan_ai', success_criteria: 'usulan_ai', tips: 'usulan_ai', common_mistakes: 'usulan_ai' },
  };
}

const uniqueIds = (steps) => { const seen = new Map(); for (const s of steps) { const n = seen.get(s.id) || 0; seen.set(s.id, n + 1); if (n) s.id = `${s.id}-${n + 1}`; } return steps; };

/** Gabungkan draf baru ke modul lama tanpa menimpa kolom yang sudah tervalidasi / diubah manusia. */
export function mergeModule(existing, draft) {
  if (!existing) return draft;
  const steps = draft.steps.map((d) => {
    const old = existing.steps.find((s) => s.id === d.id || (s.genericStepId && s.genericStepId === d.genericStepId));
    if (!old) return d;
    const merged = { ...d, ...old, provenance: d.provenance, fieldStatus: { ...d.fieldStatus, ...(old.fieldStatus || {}) } };
    for (const k of Object.keys(d.fieldStatus)) if ((old.fieldStatus?.[k] ?? 'tervalidasi') === 'usulan_ai') merged[k] = d[k];
    return merged;
  });
  // Tahap lama yang tidak muncul lagi tetap dipertahankan bila sudah disentuh manusia.
  for (const old of existing.steps) if (!steps.some((s) => s.id === old.id) && Object.values(old.fieldStatus || { x: 'tervalidasi' }).some((v) => v !== 'usulan_ai')) steps.push(old);
  return { ...draft, ...existing, steps, sources: draft.sources, generatedAt: draft.generatedAt };
}

const ownSources = (cs, tradition) => [...new Set(cs.flatMap((c) => c.members.filter((m) => m.tradition === tradition).map((m) => m.sourceId)))];

/** Bangun draf modul per tradisi + modul dasar lintas tradisi dari semua analisis. */
export async function buildCurricula(analyses, { taxonomy, useEmbeddings = aiEnabled(), minTraditionsForGeneric = 2 } = {}) {
  taxonomy ??= await loadTaxonomy();
  const steps = prepareSteps(analyses, taxonomy);
  if (useEmbeddings && steps.length) {
    try { const vecs = await embed(steps.map((s) => `${s.title}. ${(s.actions || []).join(', ')}`), 'CLUSTERING'); steps.forEach((s, i) => { s.vec = vecs[i]; }); } catch { /* lanjut tanpa embedding */ }
  }
  const clusters = canonicalOrder(cluster(steps));
  const now = new Date().toISOString();
  const modules = [];
  for (const tradition of [...new Set(analyses.map((a) => a.tradition))]) {
    const cs = clusters.filter((c) => c.traditions.includes(tradition));
    if (!cs.length) continue;
    const region = mode(analyses.filter((a) => a.tradition === tradition).map((a) => a.region).filter(Boolean));
    modules.push({
      id: `draf-${slug(tradition)}`, title: `${tradition} – Draf dari video`, tradition, region: region ?? null, level: 'pemula',
      status: 'DRAF AI – wajib ditinjau penenun tradisi ini', published: false, generatedAt: now,
      description: `Disusun otomatis dari ${ownSources(cs, tradition).length} video. Setiap tahap punya bukti waktu di video sumber.`,
      sources: ownSources(cs, tradition),
      steps: uniqueIds(cs.map((c) => toModuleStep(c, tradition))),
    });
  }
  const generic = clusters.filter((c) => c.traditions.length >= minTraditionsForGeneric);
  if (generic.length) {
    modules.push({
      id: 'dasar-lintas-tradisi', title: 'Dasar Menenun – Lintas Tradisi (draf)', tradition: 'Lintas tradisi', level: 'pemula',
      status: 'DRAF AI – tahap yang muncul di beberapa tradisi', published: false, generatedAt: now,
      description: `Tahap umum yang muncul di ${new Set(generic.flatMap((c) => c.traditions)).size} tradisi.`,
      sources: [...new Set(generic.flatMap((c) => c.sources))],
      steps: uniqueIds(generic.map((c) => toModuleStep(c, null))),
    });
  }
  const terms = analyses.flatMap((a) => (a.terms || []).map((t) => ({ ...t, sourceId: a.sourceId, tradition: a.tradition })));
  return { modules, clusters: clusters.map(({ members, ...c }) => ({ ...c, size: members.length })), terms };
}
