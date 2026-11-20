// Analitik belajar dari log sesi (bagian 2.6 "Dari data ke kurikulum").
//  1) stepDifficulty: tahap mana yang paling sulit → bahan revisi kurikulum (pecah tahap, tambah latihan bagian)
//  2) Bayesian Knowledge Tracing (Corbett & Anderson 1994; dipakai untuk keterampilan psikomotor oleh
//     UC Berkeley EECS-2023-17): peluang murid sudah menguasai tiap tahap → kapan boleh lanjut / perlu latihan ulang.
//
// Satu "percobaan" = satu kali murid mengerjakan sebuah tahap dalam sebuah sesi (step_start → step_done / ditinggal).
// Percobaan dianggap BENAR bila selesai tanpa kesalahan terdeteksi/koreksi dan dengan paling banyak 1 petunjuk.

const HINT_INTENTS = new Set(['petunjuk', 'tawar_bantuan', 'koreksi']);

/** Kelompokkan event menjadi percobaan per (sesi, tahap). */
export function attempts(events) {
  const out = new Map();
  const sorted = [...events].filter((e) => e?.sessionId && e.step).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  for (const e of sorted) {
    const key = `${e.sessionId}|${e.step}`;
    let a = out.get(key);
    if (!a) out.set(key, (a = { sessionId: e.sessionId, userId: e.userId ?? null, module: e.module, step: e.step, start: e.at, end: null, done: false, hints: 0, mistakes: 0, checks: 0, questions: 0 }));
    if (e.type === 'step_done') { a.done = true; a.end = e.at; }
    else if (e.type === 'check') { a.checks++; if (e.status === 'mistake') a.mistakes++; }
    else if (e.type === 'tutor_talk' && HINT_INTENTS.has(e.intent)) { a.hints++; if (e.intent === 'koreksi') a.mistakes++; }
    else if (e.type === 'question') a.questions++;
  }
  return [...out.values()].map((a) => ({ ...a, correct: a.done && a.mistakes === 0 && a.hints <= 1, durationSec: a.done && a.start && a.end ? (Date.parse(a.end) - Date.parse(a.start)) / 1000 : null }));
}

const median = (xs) => { const v = xs.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };

/** Laporan kesulitan per tahap, diurutkan dari yang paling sulit. */
export function stepDifficulty(events, module) {
  const byStep = new Map();
  for (const a of attempts(events)) {
    if (module && a.module !== module.id) continue;
    if (!byStep.has(a.step)) byStep.set(a.step, []);
    byStep.get(a.step).push(a);
  }
  const titles = new Map((module?.steps ?? []).map((s, i) => [s.id, { title: s.title, index: i }]));
  const rows = [...byStep].map(([step, as]) => {
    const n = as.length;
    const completion = as.filter((a) => a.done).length / n;
    const firstTry = as.filter((a) => a.correct).length / n;
    const hints = as.reduce((t, a) => t + a.hints, 0) / n;
    const mistakes = as.reduce((t, a) => t + a.mistakes, 0) / n;
    // Skor 0–1: gabungan tidak selesai, tidak benar di percobaan itu, dan beban petunjuk/kesalahan.
    const score = +(0.35 * (1 - completion) + 0.35 * (1 - firstTry) + 0.15 * Math.min(1, hints / 3) + 0.15 * Math.min(1, mistakes / 2)).toFixed(3);
    const advice = [];
    if (n >= 5 && completion < 0.6) advice.push('banyak murid berhenti di tahap ini: pertimbangkan memecahnya menjadi sub-tahap');
    if (n >= 5 && mistakes >= 0.5) advice.push('kesalahan sering muncul: tambahkan latihan bagian dan perjelas kriteria berhasil');
    if (n >= 5 && hints >= 2) advice.push('butuh banyak petunjuk: perjelas instruksi atau tambah klip demo');
    return { step, title: titles.get(step)?.title ?? step, index: titles.get(step)?.index ?? null, attempts: n, learners: new Set(as.map((a) => a.userId)).size, completion, firstTry, hintsPerAttempt: +hints.toFixed(2), mistakesPerAttempt: +mistakes.toFixed(2), medianSec: median(as.map((a) => a.durationSec)), score, advice, lowData: n < 5 };
  });
  return rows.sort((a, b) => b.score - a.score);
}

export const BKT_DEFAULTS = { pInit: 0.2, pLearn: 0.15, pSlip: 0.1, pGuess: 0.2, mastered: 0.95 };

/** Satu langkah BKT: posterior setelah observasi benar/salah, lalu transisi belajar. */
export function bktUpdate(pL, correct, p = BKT_DEFAULTS) {
  const post = correct
    ? (pL * (1 - p.pSlip)) / (pL * (1 - p.pSlip) + (1 - pL) * p.pGuess)
    : (pL * p.pSlip) / (pL * p.pSlip + (1 - pL) * (1 - p.pGuess));
  return post + (1 - post) * p.pLearn;
}

export function bktTrace(observations, p = BKT_DEFAULTS) {
  let pL = p.pInit;
  const trace = [];
  for (const c of observations) { pL = bktUpdate(pL, c, p); trace.push(+pL.toFixed(3)); }
  return { mastery: +pL.toFixed(3), mastered: pL >= p.mastered, trace };
}

/** Penguasaan per murid per tahap (urut waktu percobaan). */
export function masteryByLearner(events, p = BKT_DEFAULTS) {
  const by = new Map();
  for (const a of attempts(events).sort((x, y) => String(x.start).localeCompare(String(y.start)))) {
    if (!a.userId) continue;
    const k = `${a.userId}|${a.module}|${a.step}`;
    if (!by.has(k)) by.set(k, { userId: a.userId, module: a.module, step: a.step, obs: [] });
    by.get(k).obs.push(a.correct);
  }
  return [...by.values()].map((r) => ({ userId: r.userId, module: r.module, step: r.step, attempts: r.obs.length, ...bktTrace(r.obs, p) }));
}
