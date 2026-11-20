// Metrik model penilai tahap (rencana 6.4). "uncertain" = model menahan diri: tidak dihitung salah kelas,
// tapi menurunkan cakupan (coverage). Metrik paling penting: tingkat "selesai" palsu.
const CLASSES = ['done', 'not_yet', 'mistake'];

export function perceptionReport(rows) {
  const decided = rows.filter((r) => r.pred !== 'uncertain');
  const f1 = CLASSES.map((c) => {
    const tp = decided.filter((r) => r.pred === c && r.truth === c).length;
    const fp = decided.filter((r) => r.pred === c && r.truth !== c).length;
    const fn = rows.filter((r) => r.truth === c && r.pred !== c).length;
    const p = tp / Math.max(1, tp + fp), rc = tp / Math.max(1, tp + fn);
    return { cls: c, precision: p, recall: rc, f1: p + rc ? (2 * p * rc) / (p + rc) : 0, support: rows.filter((r) => r.truth === c).length };
  });
  const present = f1.filter((x) => x.support > 0);
  const notDone = rows.filter((r) => r.truth !== 'done');
  const mistakes = rows.filter((r) => r.truth === 'mistake');
  const ms = rows.map((r) => r.ms).filter(Number.isFinite).sort((a, b) => a - b);
  return {
    n: rows.length, coverage: decided.length / Math.max(1, rows.length),
    macroF1: present.reduce((a, x) => a + x.f1, 0) / Math.max(1, present.length), perClass: f1,
    falseDoneRate: notDone.filter((r) => r.pred === 'done').length / Math.max(1, notDone.length),
    mistakeRecall: mistakes.length ? mistakes.filter((r) => r.pred === 'mistake').length / mistakes.length : null,
    p95ms: ms.length ? ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))] : null,
  };
}

/** Gerbang 6.4: kandidat menggantikan baseline hanya bila semua syarat terpenuhi. */
export function perceptionGate(candidate, baseline, { minGain = 0.10, minF1 = 0.80, maxFalseDone = 0.05, minMistakeRecall = 0.6, maxP95 = 1200 } = {}) {
  const checks = {
    [`macro-F1 ≥ baseline + ${minGain}`]: candidate.macroF1 >= baseline.macroF1 + minGain,
    [`macro-F1 ≥ ${minF1}`]: candidate.macroF1 >= minF1,
    [`"selesai" palsu ≤ ${maxFalseDone * 100}%`]: candidate.falseDoneRate <= maxFalseDone,
    [`recall kesalahan ≥ ${minMistakeRecall}`]: candidate.mistakeRecall == null || candidate.mistakeRecall >= minMistakeRecall,
    [`latensi p95 ≤ ${maxP95} ms`]: candidate.p95ms == null || candidate.p95ms <= maxP95,
  };
  return { checks, pass: Object.values(checks).every(Boolean) };
}
