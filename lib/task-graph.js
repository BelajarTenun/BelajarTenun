// Task graph dari banyak demonstrasi (pola Video-Mined Task Graphs, Ashutosh dkk. 2023, dan
// Task Graph Maximum Likelihood Estimation, Seminara dkk. 2024 – di sini versi statistik yang bisa dijelaskan ke penenun).
//
// Masukan: deret keystep per video, mis. { sourceId: 'v1', seq: ['k0','k2','k1'] }.
// Keluaran:
//   nodes  : keystep + rasio kemunculan + wajib/opsional
//   edges  : prasyarat a → b (a hampir selalu sebelum b, didukung ≥ minSupport video), sesudah reduksi transitif
//   swaps  : pasangan yang urutannya bervariasi antar penenun (boleh ditukar)
//   order  : urutan topologis (tie-break: posisi median), siklus diputus pada sisi terlemah
//
// Semua ambang bisa diatur; nilai bawaan dipilih konservatif supaya graf tidak mengklaim urutan yang belum didukung data.

const DEFAULTS = { requiredRatio: 0.6, precedence: 0.8, minSupport: 2, swapLow: 0.2 };

/** Statistik urutan berpasangan: berapa video memuat a & b, dan berapa kali a muncul pertama sebelum b. */
export function pairStats(sequences) {
  const both = new Map(), before = new Map();
  const key = (a, b) => `${a}\u0000${b}`;
  for (const { seq } of sequences) {
    const first = new Map();
    seq.forEach((k, i) => { if (!first.has(k)) first.set(k, i); });
    const ks = [...first.keys()];
    for (const a of ks) for (const b of ks) {
      if (a === b) continue;
      both.set(key(a, b), (both.get(key(a, b)) || 0) + 1);
      if (first.get(a) < first.get(b)) before.set(key(a, b), (before.get(key(a, b)) || 0) + 1);
    }
  }
  return {
    both: (a, b) => both.get(key(a, b)) || 0,
    p: (a, b) => { const n = both.get(key(a, b)) || 0; return n ? (before.get(key(a, b)) || 0) / n : null; },
  };
}

/** Hapus sisi a→c bila ada jalur a→…→c lain (graf lebih mudah dibaca penenun). */
export function transitiveReduction(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n, new Set()]));
  for (const e of edges) adj.get(e.from)?.add(e.to);
  const reach = (from, to, skip) => {
    const stack = [...adj.get(from)].filter((x) => !(from === skip.from && x === skip.to));
    const seen = new Set();
    while (stack.length) {
      const x = stack.pop();
      if (x === to) return true;
      if (seen.has(x)) continue;
      seen.add(x);
      stack.push(...adj.get(x));
    }
    return false;
  };
  return edges.filter((e) => !reach(e.from, e.to, e));
}

/** Urutan topologis; bila ada siklus, sisi dengan p terendah dibuang sampai graf asiklik. */
export function topoOrder(nodes, edges, tieBreak = () => 0) {
  let es = [...edges];
  for (;;) {
    const indeg = new Map(nodes.map((n) => [n, 0]));
    for (const e of es) indeg.set(e.to, indeg.get(e.to) + 1);
    const ready = nodes.filter((n) => indeg.get(n) === 0).sort(tieBreak);
    const out = [];
    while (ready.length) {
      const n = ready.shift();
      out.push(n);
      for (const e of es.filter((x) => x.from === n)) {
        indeg.set(e.to, indeg.get(e.to) - 1);
        if (indeg.get(e.to) === 0) { ready.push(e.to); ready.sort(tieBreak); }
      }
    }
    if (out.length === nodes.length) return { order: out, edges: es };
    const cyc = es.filter((e) => !out.includes(e.from) && !out.includes(e.to));
    const weakest = cyc.sort((a, b) => a.p - b.p || a.support - b.support)[0];
    es = es.filter((e) => e !== weakest);
  }
}

/**
 * Bangun task graph.
 * @param {{sourceId:string, seq:string[]}[]} sequences
 * @param {{pos?: Record<string, number>}} opts  pos = posisi median relatif (0–1) per keystep untuk tie-break
 */
export function buildTaskGraph(sequences, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const total = sequences.length;
  const ids = [...new Set(sequences.flatMap((s) => s.seq))];
  const presence = Object.fromEntries(ids.map((k) => [k, sequences.filter((s) => s.seq.includes(k)).length]));
  const st = pairStats(sequences);

  const raw = [], swaps = [];
  for (const a of ids) for (const b of ids) {
    if (a >= b) continue;
    const n = st.both(a, b);
    if (n < o.minSupport) continue;
    const p = st.p(a, b);
    if (p >= o.precedence) raw.push({ from: a, to: b, p: +p.toFixed(2), support: n });
    else if (1 - p >= o.precedence) raw.push({ from: b, to: a, p: +(1 - p).toFixed(2), support: n });
    else if (p > o.swapLow && p < 1 - o.swapLow) swaps.push({ a, b, p: +p.toFixed(2), support: n });
  }
  const pos = opts.pos || {};
  const tie = (x, y) => (pos[x] ?? 0.5) - (pos[y] ?? 0.5) || presence[y] - presence[x];
  const { order, edges: acyclic } = topoOrder(ids, raw, tie);
  const edges = transitiveReduction(ids, acyclic);

  const nodes = order.map((k) => ({
    id: k, presence: +(presence[k] / Math.max(1, total)).toFixed(2), support: presence[k],
    required: presence[k] / Math.max(1, total) >= o.requiredRatio,
    prerequisites: edges.filter((e) => e.to === k).map((e) => e.from),
  }));
  return { nodes, edges, swaps, order, videos: total, params: o };
}
