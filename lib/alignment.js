// Penyelarasan hasil analisis banyak video → taksonomi bersama → kurikulum draf per tradisi
// + modul dasar lintas tradisi. Isi yang sudah divalidasi penenun tidak pernah ditimpa.
import { buildTaskGraph } from './task-graph.js';
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

/**
 * Klaster aglomeratif average-linkage: hasil tidak bergantung urutan masukan (berbeda dengan klaster serakah v1).
 * Dua langkah dari video yang sama tidak digabung bila waktunya tidak tumpang-tindih (satu video bisa mengulang aksi,
 * tapi itu tetap satu keystep; yang dicegah adalah menggabung dua keystep berbeda dari video yang sama).
 */
export function cluster(steps, threshold = 0.42) {
  let groups = steps.map((s) => [s]);
  const sim = new Map();
  const key = (i, j) => (i < j ? `${i}|${j}` : `${j}|${i}`);
  for (let i = 0; i < steps.length; i++) for (let j = i + 1; j < steps.length; j++) sim.set(key(i, j), similarity(steps[i], steps[j]));
  const idx = new Map(steps.map((s, i) => [s, i]));
  const link = (A, B) => {
    let t = 0;
    for (const a of A) for (const b of B) t += sim.get(key(idx.get(a), idx.get(b))) ?? 0;
    return t / (A.length * B.length);
  };
  for (;;) {
    let best = null, bestSim = threshold;
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const v = link(groups[i], groups[j]);
      if (v >= bestSim) { best = [i, j]; bestSim = v; }
    }
    if (!best) break;
    const [i, j] = best;
    groups[i] = [...groups[i], ...groups[j]];
    groups.splice(j, 1);
  }
  // Urutkan klaster menurut posisi median supaya id k0, k1, ... stabil dan mudah dibaca.
  return groups.map((m) => ({ members: m })).sort((a, b) => median(a.members.map((x) => x.pos)) - median(b.members.map((x) => x.pos))).map((c, i) => summarize(c, i));
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

/** Deret keystep per video (urut waktu mulai) – masukan task graph. */
export function keystepSequences(clusters) {
  const bySource = new Map();
  for (const c of clusters) for (const m of c.members) {
    if (!bySource.has(m.sourceId)) bySource.set(m.sourceId, []);
    bySource.get(m.sourceId).push([m.start ?? 0, c.id]);
  }
  return [...bySource].map(([sourceId, xs]) => ({ sourceId, seq: xs.sort((a, b) => a[0] - b[0]).map((x) => x[1]) }));
}

/** Urutan kanonik dari task graph (prasyarat dulu, tie-break posisi median); graf ikut dikembalikan. */
export function canonicalOrder(clusters, opts = {}) {
  const graph = buildTaskGraph(keystepSequences(clusters), { pos: Object.fromEntries(clusters.map((c) => [c.id, c.pos])), ...opts });
  const byId = new Map(clusters.map((c) => [c.id, c]));
  const ordered = graph.order.map((id) => byId.get(id)).filter(Boolean);
  ordered.graph = graph;
  return ordered;
}

function toModuleStep(c, tradition, graph) {
  const node = graph?.nodes.find((n) => n.id === c.id);
  // Modul satu tradisi memakai isi dari video tradisi itu sendiri; modul lintas tradisi memakai gabungan.
  const own = tradition ? c.members.filter((m) => m.tradition === tradition) : c.members;
  const v = tradition ? summarize({ members: own }, 0) : c;
  return {
    id: slug(c.actionId || v.title), title: v.title,
    instruction: v.instruction || `Lakukan: ${v.title}.`,
    tips: v.tips, success_criteria: v.success_criteria || v.title,
    common_mistakes: v.common_mistakes.filter((x) => x.mistake && x.fix),
    auto_detect: true, validated_by: null, genericStepId: c.actionId ?? null, keystep: c.id,
    optional: node ? !node.required : false, prerequisites: node?.prerequisites ?? [], support: node?.support ?? c.sources.length,
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

const subgraph = (g, ids) => ({ nodes: g.nodes.filter((n) => ids.includes(n.id)), edges: g.edges.filter((e) => ids.includes(e.from) && ids.includes(e.to)), swaps: g.swaps.filter((x) => ids.includes(x.a) && ids.includes(x.b)), videos: g.videos });
const ownSources = (cs, tradition) => [...new Set(cs.flatMap((c) => c.members.filter((m) => m.tradition === tradition).map((m) => m.sourceId)))];

/** Bangun draf modul per tradisi + modul dasar lintas tradisi dari semua analisis. */
export async function buildCurricula(analyses, { taxonomy, useEmbeddings = aiEnabled(), minTraditionsForGeneric = 2 } = {}) {
  taxonomy ??= await loadTaxonomy();
  const steps = prepareSteps(analyses, taxonomy);
  if (useEmbeddings && steps.length) {
    try { const vecs = await embed(steps.map((s) => `${s.title}. ${(s.actions || []).join(', ')}`), 'CLUSTERING'); steps.forEach((s, i) => { s.vec = vecs[i]; }); } catch { /* lanjut tanpa embedding */ }
  }
  const clusters = canonicalOrder(cluster(steps));
  const graph = clusters.graph;
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
      steps: uniqueIds(cs.map((c) => toModuleStep(c, tradition, graph))),
      taskGraph: subgraph(graph, cs.map((c) => c.id)),
    });
  }
  const generic = clusters.filter((c) => c.traditions.length >= minTraditionsForGeneric);
  if (generic.length) {
    modules.push({
      id: 'dasar-lintas-tradisi', title: 'Dasar Menenun – Lintas Tradisi (draf)', tradition: 'Lintas tradisi', level: 'pemula',
      status: 'DRAF AI – tahap yang muncul di beberapa tradisi', published: false, generatedAt: now,
      description: `Tahap umum yang muncul di ${new Set(generic.flatMap((c) => c.traditions)).size} tradisi.`,
      sources: [...new Set(generic.flatMap((c) => c.sources))],
      steps: uniqueIds(generic.map((c) => toModuleStep(c, null, graph))),
      taskGraph: subgraph(graph, generic.map((c) => c.id)),
    });
  }
  const terms = analyses.flatMap((a) => (a.terms || []).map((t) => ({ ...t, sourceId: a.sourceId, tradition: a.tradition })));
  return { modules, clusters: clusters.map(({ members, ...c }) => ({ ...c, size: members.length })), terms, taskGraph: graph };
}
