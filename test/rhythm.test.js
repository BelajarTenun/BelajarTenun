import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWav, detectOnsets, rhythmStats, rhythmForSegment } from '../lib/rhythm.js';

const SR = 16000;
/** Sinyal sintetis: derau latar kecil + "tok" (ledakan 15 ms yang meluruh) di waktu-waktu tertentu. */
function synth(times, dur, seed = 1) {
  let r = seed;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647 - 0.5; };
  const x = new Float32Array(Math.ceil(dur * SR));
  for (let i = 0; i < x.length; i++) x[i] = 0.01 * rnd();
  for (const t of times) for (let i = 0; i < 0.015 * SR; i++) { const j = Math.round(t * SR) + i; if (j < x.length) x[j] += 0.8 * Math.exp(-i / 60) * Math.sin(i * 0.9); }
  return x;
}
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return b;
}

test('ritme teratur: hentakan ganda tiap 2 dtk → 5 siklus, keteraturan tinggi', () => {
  const times = [0.5, 0.75, 2.5, 2.75, 4.5, 4.75, 6.5, 6.75, 8.5, 8.75];
  const onsets = detectOnsets(synth(times, 10), SR);
  assert.equal(onsets.length, times.length, JSON.stringify(onsets));
  onsets.forEach((t, i) => assert.ok(Math.abs(t - times[i]) < 0.03, `onset ${t} vs ${times[i]}`));
  const r = rhythmStats(onsets);
  assert.equal(r.cycles, 5);
  assert.equal(r.strikesPerCycle, 2);
  assert.ok(Math.abs(r.meanIntervalSec - 2) < 0.05);
  assert.ok(r.regularity > 0.95, String(r.regularity));
});

test('ritme tidak teratur menurunkan skor keteraturan', () => {
  const r = rhythmStats(detectOnsets(synth([0.5, 1.6, 4.9, 5.6, 9.0], 10), SR));
  assert.ok(r.regularity < 0.7, String(r.regularity));
});

test('baca WAV dan hitung ritme per segmen tahap', () => {
  const w = readWav(wav(synth([1, 3, 5, 7, 9, 11], 12)));
  assert.equal(w.sampleRate, SR);
  const seg = rhythmForSegment(w, 4, 12);
  assert.deepEqual(seg.onsets.map((t) => Math.round(t)), [5, 7, 9, 11]);
  assert.equal(seg.cycles, 4);
});

test('pipeline: setiap tahap mendapat ritme (audio) dan kinematika (bila hands.json ada)', async () => {
  const { enrichMotion } = await import('../lib/motion.js');
  const audio = wav(synth([1, 3, 5, 7], 10));
  const frames = Array.from({ length: 301 }, (_, i) => { const t = i / 30, x = 0.5 + 0.2 * Math.sin(2 * Math.PI * t); const lm = Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0 })); lm[9] = { x, y: 0.4, z: 0 }; return { t, hands: [{ handedness: 'Right', landmarks: lm }] }; });
  const files = { 'sources/v/audio.wav': audio, 'sources/v/hands.json': Buffer.from(JSON.stringify({ frames })) };
  const a = await enrichMotion({ sourceId: 'v', steps: [{ title: 'rapat', start: 0, end: 10 }, { title: 'kosong', start: 5, end: 5 }] }, { readFile: async (p) => { if (!files[p]) throw new Error('tidak ada'); return files[p]; } });
  assert.equal(a.steps[0].motion.rhythm.cycles, 4);
  assert.ok(a.steps[0].motion.hands.right.cycles > 10);
  assert.equal(a.steps[1].motion, undefined, 'rentang tidak valid dilewati');
  assert.deepEqual(a.motion, { audio: true, hands: true, steps: 1, validated: false });
});
