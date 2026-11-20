// Validasi ukuran gerak (kinematika tangan & ritme) SEBELUM dipakai menilai murid.
// Pertanyaannya: apakah ukuran ini benar-benar membedakan penenun dari pemula pada tahap yang sama?
//
//   node scripts/validate_motion.js --cases data/eval/motion/cases.json
//
// cases.json: [{ "group": "penenun" | "pemula", "person": "nama", "motion": "file.json" (hand_pose.py),
//                "audio": "audio.wav" (opsional), "segments": [{ "step": "rapat-pakan", "start": 12.0, "end": 40.0 }] }]
// Untuk tiap (tahap, fitur): uji Mann–Whitney U penenun vs pemula + effect size r.
// Fitur dinyatakan LAYAK dipakai bila p < 0,05 DAN r ≥ 0,3 (efek sedang) dengan ≥ 5 orang per kelompok.
// Hasil: logs/eval/<waktu>-motion-validation.json. Tanpa fitur layak, tutor TIDAK boleh menilai gerak murid.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { segmentKinematics, mannWhitney } from '../lib/kinematics.js';
import { readWav, rhythmForSegment } from '../lib/rhythm.js';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const path = arg('cases');
if (!path) { console.error('Pakai: --cases cases.json'); process.exit(2); }
const base = dirname(resolve(path));
const cases = JSON.parse(readFileSync(path, 'utf8'));

const rows = [];
for (const c of cases) {
  const motion = c.motion ? JSON.parse(readFileSync(join(base, c.motion), 'utf8')).frames : null;
  const wav = c.audio ? readWav(readFileSync(join(base, c.audio))) : null;
  for (const s of c.segments) {
    const f = {};
    if (motion) for (const [hand, feats] of Object.entries(segmentKinematics(motion, s.start, s.end))) for (const [k, v] of Object.entries(feats || {})) if (Number.isFinite(v)) f[`${hand}.${k}`] = v;
    if (wav) for (const [k, v] of Object.entries(rhythmForSegment(wav, s.start, s.end))) if (Number.isFinite(v) && !['start', 'end'].includes(k)) f[`ritme.${k}`] = v;
    rows.push({ group: c.group, person: c.person, step: s.step, features: f });
  }
}

const results = [];
for (const step of [...new Set(rows.map((r) => r.step))]) {
  const rs = rows.filter((r) => r.step === step);
  for (const feat of [...new Set(rs.flatMap((r) => Object.keys(r.features)))]) {
    // Satu nilai per orang (median), supaya orang dengan banyak rekaman tidak mendominasi.
    const per = (g) => Object.values(rs.filter((r) => r.group === g && feat in r.features).reduce((m, r) => ((m[r.person] ??= []).push(r.features[feat]), m), {}))
      .map((xs) => xs.sort((a, b) => a - b)[xs.length >> 1]);
    const ahli = per('penenun'), pemula = per('pemula');
    if (ahli.length < 2 || pemula.length < 2) continue;
    const mw = mannWhitney(ahli, pemula);
    const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
    results.push({ step, feature: feat, nPenenun: ahli.length, nPemula: pemula.length, medianPenenun: med(ahli), medianPemula: med(pemula), ...mw,
      layak: ahli.length >= 5 && pemula.length >= 5 && mw.p < 0.05 && mw.r >= 0.3 });
  }
}
results.sort((a, b) => a.p - b.p);
console.table(results.slice(0, 30).map((r) => ({ tahap: r.step, fitur: r.feature, penenun: r.medianPenenun, pemula: r.medianPemula, p: r.p, r: r.r, layak: r.layak ? 'YA' : '' })));
const ok = results.filter((r) => r.layak);
console.log(ok.length ? `${ok.length} fitur layak dipakai untuk umpan balik gerak.` : 'Belum ada fitur yang layak: jangan menilai gerak murid dulu (kumpulkan ≥5 penenun & ≥5 pemula per tahap).');
mkdirSync('logs/eval', { recursive: true });
writeFileSync(`logs/eval/${new Date().toISOString().replace(/[:.]/g, '-')}-motion-validation.json`, JSON.stringify({ cases: cases.length, results }, null, 2));
