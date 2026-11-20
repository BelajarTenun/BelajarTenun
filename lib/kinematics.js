// Kinematika tangan dari landmark MediaPipe Hands (21 titik per tangan; scripts/hand_pose.py).
// Fitur mengikuti riset penilaian keterampilan tangan pemula vs ahli (jahitan/simpul bedah dengan MediaPipe):
// panjang lintasan, kecepatan, kehalusan (jerk), jumlah siklus gerak, dan porsi waktu diam.
// Koordinat MediaPipe dinormalkan 0–1 terhadap ukuran gambar; semua jarak di sini dibagi ukuran telapak
// (pergelangan → pangkal jari tengah) supaya tidak bergantung jarak kamera.
//
// PENTING: belum tervalidasi untuk tenun. Gunakan scripts/validate_motion.js (penenun vs pemula) dulu.

const WRIST = 0, MIDDLE_MCP = 9;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** frames: [{ t (detik), hands: [{ handedness:'Left'|'Right', landmarks:[{x,y,z}×21] }] }] → deret per tangan. */
export function trackHands(frames) {
  const tracks = { Left: [], Right: [] };
  for (const f of frames) for (const h of f.hands || []) {
    if (!tracks[h.handedness] || h.landmarks?.length !== 21) continue;
    const palm = dist(h.landmarks[WRIST], h.landmarks[MIDDLE_MCP]);
    if (palm > 0) tracks[h.handedness].push({ t: f.t, x: h.landmarks[WRIST].x, y: h.landmarks[WRIST].y, palm });
  }
  return tracks;
}

/** Fitur satu tangan pada rentang [start, end]. */
export function handFeatures(track, start = -Infinity, end = Infinity, { idleSpeed = 0.5, minCycleGap = 0.25 } = {}) {
  const p = track.filter((q) => q.t >= start && q.t <= end);
  if (p.length < 5) return null;
  const palm = p.map((q) => q.palm).sort((a, b) => a - b)[p.length >> 1];
  const v = [];
  let path = 0;
  for (let i = 1; i < p.length; i++) {
    const dt = p[i].t - p[i - 1].t;
    if (dt <= 0) continue;
    const d = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) / palm;
    path += d;
    v.push({ t: p[i].t, speed: d / dt, dt });
  }
  const dur = p.at(-1).t - p[0].t;
  // Kehalusan: log dimensionless jerk (makin negatif = makin tersendat). Dihitung dari turunan kecepatan.
  const acc = v.slice(1).map((x, i) => ({ t: x.t, a: (x.speed - v[i].speed) / x.dt }));
  const jerk = acc.slice(1).map((x, i) => (x.a - acc[i].a) / Math.max(1e-3, x.t - acc[i].t));
  const vMax = Math.max(1e-6, ...v.map((x) => x.speed));
  const jerkInt = jerk.reduce((s, j, i) => s + j * j * (v[i + 2]?.dt ?? 0), 0);
  const ldlj = -Math.log(Math.max(1e-12, (jerkInt * dur ** 3) / (vMax * vMax)));
  // Siklus gerak: puncak kecepatan di atas titik tengah median–persentil 95, terpisah ≥ minCycleGap detik
  // (mis. satu hentakan / satu lemparan). Ambang relatif ini bekerja untuk gerak mulus maupun hentakan tajam.
  const sp = v.map((x) => x.speed).sort((a, b) => a - b);
  const thr = 0.5 * ((sp[sp.length >> 1] ?? 0) + (sp[Math.floor(sp.length * 0.95)] ?? 0));
  const peaks = [];
  for (let i = 1; i < v.length - 1; i++) if (v[i].speed > thr && v[i].speed >= v[i - 1].speed && v[i].speed >= v[i + 1].speed && (!peaks.length || v[i].t - peaks.at(-1) >= minCycleGap)) peaks.push(v[i].t);
  const iv = peaks.slice(1).map((t, i) => t - peaks[i]);
  const ivMean = iv.reduce((a, x) => a + x, 0) / (iv.length || 1);
  const ivCV = iv.length >= 2 ? Math.sqrt(iv.reduce((a, x) => a + (x - ivMean) ** 2, 0) / iv.length) / ivMean : null;
  return {
    durationSec: +dur.toFixed(2),
    pathPalms: +path.toFixed(2),                                   // panjang lintasan pergelangan (satuan: lebar telapak)
    meanSpeed: +(path / Math.max(1e-6, dur)).toFixed(3),            // telapak per detik
    idleRatio: +(v.filter((x) => x.speed < idleSpeed).reduce((a, x) => a + x.dt, 0) / Math.max(1e-6, dur)).toFixed(3),
    smoothnessLDLJ: Number.isFinite(ldlj) ? +ldlj.toFixed(2) : null,
    cycles: peaks.length,
    cycleIntervalCV: ivCV == null ? null : +ivCV.toFixed(3),
  };
}

/** Fitur kedua tangan untuk satu segmen tahap. */
export function segmentKinematics(frames, start, end) {
  const t = trackHands(frames);
  return { left: handFeatures(t.Left, start, end), right: handFeatures(t.Right, start, end) };
}

/** Uji Mann–Whitney U (dua sisi, aproksimasi normal) + effect size r. Untuk validasi penenun vs pemula. */
export function mannWhitney(a, b) {
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  let i = 0;
  while (i < all.length) { let j = i; while (j + 1 < all.length && all[j + 1].v === all[i].v) j++; for (let k = i; k <= j; k++) all[k].rank = (i + j) / 2 + 1; i = j + 1; }
  const n1 = a.length, n2 = b.length;
  const r1 = all.filter((x) => x.g === 0).reduce((s, x) => s + x.rank, 0);
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2, sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sigma ? (u - mu) / sigma : 0;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { u, z: +z.toFixed(3), p: +p.toFixed(4), r: +(Math.abs(z) / Math.sqrt(n1 + n2)).toFixed(3) };
}
function normCdf(x) { // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * x / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + y);
}
