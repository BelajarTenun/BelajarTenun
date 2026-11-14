// Metrik evaluasi baku untuk asisten prosedural dari sudut pandang pemakai.
// Fungsi murni (tanpa I/O) supaya bisa dites dan dipakai ulang oleh semua skrip evaluasi.
//
// Rujukan istilah:
// - Klasifikasi status tahap & deteksi kesalahan: precision/recall/F1 per kelas, macro-F1, Cohen's kappa
//   (dipakai di benchmark HoloAssist & turunannya).
// - Segmentasi tahap pada video: F1@{10,25,50} berbasis IoU segmen dan Edit score
//   (Lea et al. 2017; Farha & Gall, MS-TCN 2019), plus F1 batas tahap dengan toleransi detik.
// - Interval kepercayaan: bootstrap persentil (Efron & Tibshirani 1993).

/** Generator acak ber-seed (mulberry32) supaya bootstrap bisa direproduksi. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function percentile(values, p) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

/** Interval kepercayaan bootstrap untuk statistik apa pun atas daftar item. */
export function bootstrapCI(items, stat, { iterations = 1000, alpha = 0.05, seed = 7 } = {}) {
  if (!items.length) return { value: null, low: null, high: null };
  const rand = rng(seed), n = items.length, vals = [];
  for (let b = 0; b < iterations; b++) {
    const sample = Array.from({ length: n }, () => items[Math.floor(rand() * n)]);
    vals.push(stat(sample));
  }
  return { value: stat(items), low: percentile(vals, alpha / 2), high: percentile(vals, 1 - alpha / 2) };
}

/**
 * Laporan klasifikasi dari pasangan {label, predicted}.
 * labels: kelas yang dinilai (prediksi di luar daftar, mis. "uncertain"/"error", dihitung salah).
 */
export function classificationReport(pairs, labels) {
  const perClass = {};
  for (const c of labels) {
    const tp = pairs.filter((p) => p.label === c && p.predicted === c).length;
    const fp = pairs.filter((p) => p.label !== c && p.predicted === c).length;
    const fn = pairs.filter((p) => p.label === c && p.predicted !== c).length;
    const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
    perClass[c] = { precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, support: tp + fn };
  }
  const present = labels.filter((c) => perClass[c].support > 0);
  const n = pairs.length;
  const accuracy = n ? pairs.filter((p) => p.label === p.predicted).length / n : 0;
  return { n, accuracy, macroF1: present.length ? present.reduce((s, c) => s + perClass[c].f1, 0) / present.length : 0, kappa: cohenKappa(pairs, labels), perClass };
}

/** Cohen's kappa: kesepakatan di atas kebetulan (berguna juga untuk antar-penilai manusia). */
export function cohenKappa(pairs, labels) {
  const n = pairs.length;
  if (!n) return 0;
  const po = pairs.filter((p) => p.label === p.predicted).length / n;
  const pe = labels.reduce((s, c) => s + (pairs.filter((p) => p.label === c).length / n) * (pairs.filter((p) => p.predicted === c).length / n), 0);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

/**
 * Deteksi kesalahan: (a) biner "ada kesalahan atau tidak", (b) ketepatan jenis kesalahan
 * di antara frame berlabel kesalahan yang terdeteksi sebagai kesalahan.
 */
export function mistakeReport(results) {
  const binary = results.map((r) => ({ label: r.label === 'mistake' ? 'mistake' : 'ok', predicted: r.predicted === 'mistake' ? 'mistake' : 'ok' }));
  const detected = results.filter((r) => r.label === 'mistake' && r.predicted === 'mistake' && r.mistakeIndex != null);
  return {
    detection: classificationReport(binary, ['mistake']).perClass.mistake,
    typeAccuracy: detected.length ? detected.filter((r) => r.predictedMistakeIndex === r.mistakeIndex).length / detected.length : null,
    typeSupport: detected.length,
  };
}

// ---------- Segmentasi tahap pada video ----------
const iou = (a, b) => {
  const inter = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const union = Math.max(a.end, b.end) - Math.min(a.start, b.start);
  return union > 0 ? inter / union : 0;
};

/** F1@τ: prediksi benar bila IoU ≥ τ dengan segmen acuan berkelas sama yang belum terpakai. */
export function segmentF1(pred, gt, threshold) {
  const used = new Set();
  let tp = 0;
  for (const p of pred) {
    let best = -1, bestIou = 0;
    gt.forEach((g, j) => { if (!used.has(j) && g.stepId === p.stepId) { const v = iou(p, g); if (v > bestIou) { bestIou = v; best = j; } } });
    if (best >= 0 && bestIou >= threshold) { tp++; used.add(best); }
  }
  const precision = pred.length ? tp / pred.length : 0, recall = gt.length ? tp / gt.length : 0;
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

/** Edit score: 100 × (1 − jarak Levenshtein ternormalisasi) atas urutan tahap. Menghukum urutan salah & over-segmentation. */
export function editScore(pred, gt) {
  const a = collapse(pred), b = collapse(gt);
  if (!a.length && !b.length) return 100;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 100 * (1 - d[a.length][b.length] / Math.max(a.length, b.length));
}
const collapse = (segs) => [...segs].sort((x, y) => x.start - y.start).map((s) => s.stepId).filter((s, i, arr) => s !== arr[i - 1]);

/** F1 batas tahap: batas prediksi dianggap benar bila dalam ±tolerance detik dari batas acuan. */
export function boundaryF1(pred, gt, tolerance = 3) {
  const bounds = (segs) => [...new Set(segs.flatMap((s) => [s.start, s.end]))].sort((x, y) => x - y);
  const p = bounds(pred), g = bounds(gt), used = new Set();
  let tp = 0;
  for (const x of p) {
    const j = g.findIndex((y, k) => !used.has(k) && Math.abs(x - y) <= tolerance);
    if (j >= 0) { tp++; used.add(j); }
  }
  const precision = p.length ? tp / p.length : 0, recall = g.length ? tp / g.length : 0;
  return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
}

export function segmentationReport(pred, gt, { tolerance = 3 } = {}) {
  return {
    f1_10: segmentF1(pred, gt, 0.1), f1_25: segmentF1(pred, gt, 0.25), f1_50: segmentF1(pred, gt, 0.5),
    edit: editScore(pred, gt), boundaryF1: boundaryF1(pred, gt, tolerance),
  };
}

// ---------- Tanya jawab berbasis pengetahuan ----------
/**
 * items: [{expected: [id…] | [] (harus menolak), retrieved: [id…]}]
 * - recall@k   : pertanyaan dalam cakupan yang sumber benarnya ada di k teratas
 * - MRR        : rata-rata 1/peringkat sumber benar pertama
 * - abstention : pertanyaan di luar cakupan yang benar-benar ditolak (tidak mengarang)
 */
export function retrievalReport(items, k = 3) {
  const inScope = items.filter((i) => i.expected.length), outScope = items.filter((i) => !i.expected.length);
  const rank = (i) => { const r = i.retrieved.slice(0, k).findIndex((id) => i.expected.includes(id)); return r < 0 ? null : r + 1; };
  return {
    n: items.length,
    recallAtK: inScope.length ? inScope.filter((i) => rank(i) != null).length / inScope.length : null,
    mrr: inScope.length ? inScope.reduce((s, i) => s + (rank(i) ? 1 / rank(i) : 0), 0) / inScope.length : null,
    abstention: outScope.length ? outScope.filter((i) => !i.retrieved.length).length / outScope.length : null,
    k,
  };
}
