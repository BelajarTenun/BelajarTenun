// Penilaian sesi simulasi (rencana bagian 7.2): rekaman ego diputar sebagai kamera ke sesi Live sungguhan,
// lalu event sesi dibandingkan dengan label emas waktu selesai tiap tahap.
//
// truth  : { offset?: detik jeda antara mulai sesi dan mulai video, steps: [{ end: detik selesai tahap di video }] }
// events : baris log sesi (logs/sessions.jsonl) satu sesi: { type, at, source?, name? }
//
// Metrik:
//   onTime / premature / late / missed  – ketepatan maju tahap (premature paling berbahaya: murid dianggap selesai padahal belum)
//   unverifiedVisionAdvance              – maju "vision" tanpa check_my_work dalam 30 dtk sebelumnya (melanggar aturan tool)
//   talkPerMin                           – frekuensi tutor bicara (proxy interupsi)
//   cultureCalls                         – jumlah search_knowledge (dibandingkan dengan jumlah pertanyaan budaya di skrip audio)

const DEFAULTS = { earlyTol: 3, lateTol: 20, verifyWindow: 30 };

export function scoreSession(events, truth, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const evs = [...events].filter((e) => e.at).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const start = evs.find((e) => e.type === 'session_start') ?? evs[0];
  if (!start) return { error: 'tidak ada event' };
  const t0 = Date.parse(start.at) + (truth.offset ?? 0) * 1000;
  const sec = (e) => (Date.parse(e.at) - t0) / 1000;
  const startIndex = start.startIndex ?? 0;
  const advances = evs.filter((e) => e.type === 'step_done');
  const tools = evs.filter((e) => e.type === 'tool');

  const rows = truth.steps.slice(startIndex).map((st, i) => {
    const adv = advances[i];
    if (!adv) return { step: startIndex + i, truthEnd: st.end, verdict: 'missed' };
    const t = +sec(adv).toFixed(1);
    const delta = +(t - st.end).toFixed(1);
    const verdict = delta < -o.earlyTol ? 'premature' : delta > o.lateTol ? 'late' : 'on_time';
    // Cek kamera harus baru: dalam jendela waktu DAN setelah maju tahap sebelumnya (satu cek tidak boleh dipakai dua kali).
    const prev = i > 0 && advances[i - 1] ? sec(advances[i - 1]) : -Infinity;
    const checked = tools.some((x) => x.name === 'check_my_work' && sec(x) <= t && sec(x) >= t - o.verifyWindow && sec(x) > prev);
    return { step: startIndex + i, truthEnd: st.end, advancedAt: t, delta, verdict, source: adv.source ?? null, verifiedByCheck: checked };
  });
  const n = rows.length || 1;
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  const durMin = Math.max(1 / 60, (Date.parse(evs.at(-1).at) - Date.parse(start.at)) / 60000);
  return {
    steps: rows,
    onTime: count('on_time') / n, premature: count('premature') / n, late: count('late') / n, missed: count('missed') / n,
    extraAdvances: Math.max(0, advances.length - rows.length),
    unverifiedVisionAdvance: rows.filter((r) => r.source === 'vision' && !r.verifiedByCheck).length,
    talkPerMin: +(evs.filter((e) => e.type === 'tutor_talk' || e.type === 'tutor_said').length / durMin).toFixed(2),
    cultureCalls: tools.filter((x) => x.name === 'search_knowledge').length,
    meanAbsDelta: +(rows.filter((r) => r.delta != null).reduce((a, r) => a + Math.abs(r.delta), 0) / Math.max(1, rows.filter((r) => r.delta != null).length)).toFixed(1),
  };
}

/** Gerbang rilis tutor (rencana 7.2): dipakai CI/evaluasi malam. */
export function gate(scores, { maxPremature = 0.05, minOnTime = 0.7, maxUnverified = 0 } = {}) {
  const avg = (k) => scores.reduce((a, s) => a + s[k], 0) / Math.max(1, scores.length);
  const res = { premature: avg('premature'), onTime: avg('onTime'), unverified: scores.reduce((a, s) => a + s.unverifiedVisionAdvance, 0) };
  return { ...res, pass: res.premature <= maxPremature && res.onTime >= minOnTime && res.unverified <= maxUnverified };
}
