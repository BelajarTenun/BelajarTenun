// Ritme hentakan dari suara (bagian 2.7 "Dari data ke kurikulum"): saat merapatkan pakan, belida/sisir dihentakkan.
// Bunyi hentakan = lonjakan energi singkat. Dari audio.wav hasil pra-proses (16 kHz mono) kita ambil:
//   onsets (detik), selang antar siklus, tempo (siklus/menit), dan keteraturan (1 − koefisien variasi selang).
// Hentakan yang berdekatan (< groupGap, bawaan 0,6 dtk) dihitung satu siklus pakan (pola "Gratitude Loom" ESP32+IMU).
//
// PENTING: ukuran ini BELUM tervalidasi untuk menilai murid. Sebelum dipakai memberi umpan balik, bandingkan
// rekaman penenun vs pemula (scripts/validate_motion.js) dan cocokkan dengan penilaian penenun.

/** Baca WAV PCM 16-bit → { sampleRate, samples: Float32Array (mono) }. */
export function readWav(buf) {
  const b = Buffer.from(buf);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('bukan berkas WAV');
  let off = 12, fmt = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4), body = off + 8;
    if (id === 'fmt ') fmt = { channels: b.readUInt16LE(body + 2), sampleRate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    if (id === 'data') {
      if (!fmt || fmt.bits !== 16) throw new Error('hanya WAV PCM 16-bit');
      const n = Math.floor(size / 2 / fmt.channels), out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(body + i * 2 * fmt.channels) / 32768;
      return { sampleRate: fmt.sampleRate, samples: out };
    }
    off = body + size + (size % 2);
  }
  throw new Error('chunk data tidak ditemukan');
}

/** Deteksi onset: energi per jendela 10 ms, kenaikan energi (flux), ambang adaptif median + k·MAD, jarak minimum. */
export function detectOnsets(samples, sampleRate, { hopMs = 10, k = 6, minGapMs = 120 } = {}) {
  const hop = Math.max(1, Math.round((sampleRate * hopMs) / 1000));
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { let e = 0; for (let i = f * hop; i < (f + 1) * hop; i++) e += samples[i] * samples[i]; energy[f] = Math.log1p(1000 * e / hop); }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, energy[f] - energy[f - 1]);
  const sorted = [...flux].sort((a, b) => a - b);
  const med = sorted[sorted.length >> 1] ?? 0;
  const mad = [...flux].map((x) => Math.abs(x - med)).sort((a, b) => a - b)[flux.length >> 1] ?? 0;
  const thr = med + k * (mad || 1e-3);
  const onsets = [];
  const minGap = minGapMs / hopMs;
  for (let f = 1; f < frames - 1; f++) {
    if (flux[f] > thr && flux[f] >= flux[f - 1] && flux[f] >= flux[f + 1] && (!onsets.length || f - onsets.at(-1) >= minGap)) onsets.push(f);
  }
  return onsets.map((f) => +((f * hop) / sampleRate).toFixed(3));
}

/** Ringkasan ritme dari daftar onset (detik). */
export function rhythmStats(onsets, { groupGap = 0.6 } = {}) {
  const cycles = [];
  for (const t of onsets) { if (!cycles.length || t - cycles.at(-1).at(-1) > groupGap) cycles.push([t]); else cycles.at(-1).push(t); }
  const starts = cycles.map((c) => c[0]);
  const iv = starts.slice(1).map((t, i) => t - starts[i]);
  const mean = iv.reduce((a, x) => a + x, 0) / (iv.length || 1);
  const sd = Math.sqrt(iv.reduce((a, x) => a + (x - mean) ** 2, 0) / (iv.length || 1));
  const cv = iv.length >= 2 ? sd / mean : null;
  return {
    strikes: onsets.length, cycles: cycles.length,
    strikesPerCycle: cycles.length ? +(onsets.length / cycles.length).toFixed(2) : null,
    meanIntervalSec: iv.length ? +mean.toFixed(2) : null,
    cyclesPerMin: iv.length ? +(60 / mean).toFixed(1) : null,
    intervalCV: cv == null ? null : +cv.toFixed(3),
    regularity: cv == null ? null : +Math.max(0, 1 - cv).toFixed(3),
  };
}

/** Ritme untuk satu rentang waktu (mis. satu tahap "merapatkan pakan" dari analisis video). */
export function rhythmForSegment(wav, start, end, opts) {
  const a = Math.max(0, Math.floor(start * wav.sampleRate)), b = Math.min(wav.samples.length, Math.ceil(end * wav.sampleRate));
  const onsets = detectOnsets(wav.samples.subarray(a, b), wav.sampleRate, opts).map((t) => +(t + start).toFixed(3));
  return { start, end, onsets, ...rhythmStats(onsets, opts) };
}
